// src/services/proxyService.ts
import { Context } from 'hono';
import { Env, ProxiedTarget, RequestLog, RequestLogInput, createRequestLog } from '../db';
import { ProxyConfigVariables } from '../middleware/config-check'; // For c.get('proxyConfig')
import { applyRequestHeaderRules, applyResponseHeaderRules, applyResponseRules } from './ruleEngineService'; // Import rule engine functions
import { generateCacheKey, getCachedResponse, storeResponseInCache, findMatchingCacheSetting } from './cacheService'; // Import cache functions

// Define a more specific context type if needed, or ensure Env includes Variables for proxyConfig
type ContextWithProxyConfig = Context<{ Bindings: Env, Variables: ProxyConfigVariables }>; // Env here should include CACHE_STORE

// Headers to remove from the request to the origin
const REQUEST_HEADERS_TO_REMOVE = [
  'host', // Will be set based on targetUrl
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
  'x-forwarded-proto',
  'x-forwarded-host', // We might add our own
  'x-real-ip',
  // Add any other headers that should not be passed to the origin
];

// Headers to remove from the response from the origin
const RESPONSE_HEADERS_TO_REMOVE = [
  'content-encoding', // Let the worker/client handle encoding
  'content-length',   // Will be recalculated
  'transfer-encoding', // Often problematic with streaming and workers
  // 'set-cookie', // Handled specially for path/domain rewriting
  // Add any other headers that should not be sent back to the client
];


export async function handleProxiedRequest(
  c: ContextWithProxyConfig,
  originalRequest: Request
): Promise<Response> {
  const startTime = Date.now();
  const proxyConfig = c.get('proxyConfig');

  if (!proxyConfig) {
    console.error("Proxy configuration not found in context for handleProxiedRequest.");
    // Consider logging this critical failure to the DB as well if a structure for system errors exists
    return c.json({ error: 'Proxy configuration not found in context.' }, 500);
  }

  const requestUrlObject = new URL(originalRequest.url);
  // Use the user's simpler originalPathAndQuery derivation, assuming originalRequest.url is appropriately formed.
  const originalPathAndQuery = requestUrlObject.pathname + requestUrlObject.search;
  
  // These are needed for the re-integrated redirect logic
  const requestProtocol = c.req.param('protocol');
  const requestDomain = c.req.param('domain');

  const clientIp = originalRequest.headers.get('cf-connecting-ip') || originalRequest.headers.get('x-forwarded-for')?.split(',')[0].trim() || c.req.header('X-Real-IP') || 'unknown';

  let cacheStatus: RequestLog['cache_status'] = 'BYPASS';
  let logData: Partial<RequestLogInput> = {
     target_url_prefix: proxyConfig.target_url_prefix,
     original_request_url: originalRequest.url,
     request_method: originalRequest.method,
     client_ip: clientIp,
  };

  try {
     const reqHeaders: Record<string, string> = {};
     originalRequest.headers.forEach((val, key) => reqHeaders[key] = val);
     logData.request_headers = JSON.stringify(reqHeaders);

     if (originalRequest.method !== 'GET' && originalRequest.method !== 'HEAD' && originalRequest.body) {
         try {
             const reqBodyClone = originalRequest.clone();
             logData.request_body = await reqBodyClone.text();
         } catch (e) {
             console.warn("Could not read request body for logging:", e);
             logData.request_body = "[Error reading body]";
         }
     }
     
     const cacheKey = await generateCacheKey(originalPathAndQuery, proxyConfig.target_url_prefix);
     const cachedResp = await getCachedResponse(c.env.DB, cacheKey, c.env as Env);
     if (cachedResp) {
         console.log(`Cache HIT for key: ${cacheKey}, URL: ${originalRequest.url}`);
         cacheStatus = 'HIT';
         cachedResp.headers.set('X-GProxy-Cache-Status', 'HIT');
         
         logData.proxied_request_url = `CACHE_HIT: ${cacheKey}`;
         logData.response_status_code = cachedResp.status;
         const respHeadersHit: Record<string, string> = {};
         cachedResp.headers.forEach((val, key) => respHeadersHit[key] = val);
         logData.response_headers = JSON.stringify(respHeadersHit);
         // logData.response_body = "[FROM CACHE]"; // Optionally log actual cached body
         logData.duration_ms = Date.now() - startTime;
         logData.cache_status = cacheStatus;
         
         c.executionCtx.waitUntil(createRequestLog(c.env.DB, logData as RequestLogInput));
         return cachedResp;
     }
     cacheStatus = 'MISS';
     console.log(`Cache MISS for key: ${cacheKey}, URL: ${originalRequest.url}`);

     const baseTargetUrl = proxyConfig.target_url_prefix.endsWith('/')
        ? proxyConfig.target_url_prefix
        : proxyConfig.target_url_prefix + '/';
     const relativePathForTarget = originalPathAndQuery.startsWith('/')
        ? originalPathAndQuery.substring(1)
        : originalPathAndQuery;
     const targetUrl = new URL(relativePathForTarget, baseTargetUrl);
     logData.proxied_request_url = targetUrl.toString();

     let processedRequestHeaders = new Headers(originalRequest.headers);
     REQUEST_HEADERS_TO_REMOVE.forEach(h => processedRequestHeaders.delete(h));
     processedRequestHeaders.set('Host', targetUrl.host);
     processedRequestHeaders.set('X-Forwarded-For', clientIp);
     processedRequestHeaders.set('X-Forwarded-Host', requestUrlObject.host);
     processedRequestHeaders.set('X-Forwarded-Proto', requestUrlObject.protocol.replace(':', ''));
     
     processedRequestHeaders = await applyRequestHeaderRules(c.env.DB, processedRequestHeaders, proxyConfig.target_url_prefix);

     const originResponse = await fetch(targetUrl.toString(), {
         method: originalRequest.method,
         headers: processedRequestHeaders,
         body: originalRequest.method !== 'GET' && originalRequest.method !== 'HEAD' ? originalRequest.body : undefined,
         redirect: 'manual',
     });

     logData.response_status_code = originResponse.status;
     const respHeadersOrig: Record<string, string> = {};
     originResponse.headers.forEach((val, key) => respHeadersOrig[key] = val);
     logData.response_headers = JSON.stringify(respHeadersOrig);

     let responseForClient = originResponse.clone();
     
     let tempHeaders = await applyResponseHeaderRules(c.env.DB, new Headers(responseForClient.headers), proxyConfig.target_url_prefix);
     responseForClient = new Response(responseForClient.body, { status: responseForClient.status, statusText: responseForClient.statusText, headers: tempHeaders });
     
     responseForClient = await applyResponseRules(c.env.DB, responseForClient, proxyConfig.target_url_prefix);

     const finalRespHeaders: Record<string, string> = {};
     responseForClient.headers.forEach((val, key) => finalRespHeaders[key] = val);
     logData.response_headers = JSON.stringify(finalRespHeaders);

     const contentType = responseForClient.headers.get('content-type');
     if (responseForClient.body && contentType && (contentType.includes('text') || contentType.includes('json') || contentType.includes('xml') || contentType.includes('application/javascript'))) {
         try {
             const respBodyClone = responseForClient.clone();
             logData.response_body = await respBodyClone.text();
         } catch (e) {
             console.warn("Could not read response body for logging:", e);
             logData.response_body = "[Error reading body]";
         }
     } else if (responseForClient.body) {
        logData.response_body = "[Binary or non-text body]";
     }

     const matchingCacheSetting = await findMatchingCacheSetting(c.env.DB, originalPathAndQuery, proxyConfig.target_url_prefix);
     if (matchingCacheSetting) {
         await storeResponseInCache(c.env.DB, originalPathAndQuery, responseForClient.clone(), matchingCacheSetting, proxyConfig.target_url_prefix, c.env as Env);
     }
     
     responseForClient.headers.set('X-GProxy-Cache-Status', cacheStatus);
     logData.cache_status = cacheStatus;
     logData.duration_ms = Date.now() - startTime;

     // Re-integrated redirect logic from the original file
     if ([301, 302, 303, 307, 308].includes(responseForClient.status)) {
        const locationHeader = responseForClient.headers.get('Location');
        if (locationHeader) {
          const newRedirectHeaders = new Headers(responseForClient.headers);
          let newLocation: URL;
          try {
            newLocation = new URL(locationHeader, targetUrl.origin);
          } catch (e) {
            console.error("Invalid Location header from origin:", locationHeader, e);
            // Log current data and return original response if redirect URL is invalid
            c.executionCtx.waitUntil(createRequestLog(c.env.DB, logData as RequestLogInput));
            return responseForClient;
          }

          if (requestProtocol && requestDomain) { // Check if params needed for rewrite are available
            const proxyBasePath = originalRequest.url.substring(0, originalRequest.url.indexOf(`/${requestProtocol}/${requestDomain}`));
            const proxiedLocationPath = `${proxyBasePath}/${newLocation.protocol.replace(':','').toLowerCase()}/${newLocation.host}${newLocation.pathname}${newLocation.search}`;
            
            newRedirectHeaders.set('Location', proxiedLocationPath);
            console.log(`Rewriting redirect: ${locationHeader} -> ${proxiedLocationPath}`);
            
            logData.response_status_code = responseForClient.status;
            const redirectHeadersForLog: Record<string, string> = {};
            newRedirectHeaders.forEach((value, key) => {
              redirectHeadersForLog[key] = value;
            });
            logData.response_headers = JSON.stringify(redirectHeadersForLog);
            // duration_ms and cache_status are already set
            c.executionCtx.waitUntil(createRequestLog(c.env.DB, logData as RequestLogInput));
            return new Response(null, { status: responseForClient.status, headers: newRedirectHeaders });
          } else {
            console.warn("Could not rewrite redirect: protocol/domain params missing from c.req.param. Passing redirect through.");
            // Log current data and return original response
            c.executionCtx.waitUntil(createRequestLog(c.env.DB, logData as RequestLogInput));
            return responseForClient;
          }
        }
     }

     c.executionCtx.waitUntil(createRequestLog(c.env.DB, logData as RequestLogInput));
     return responseForClient;

  } catch (error: any) {
     console.error("Error in handleProxiedRequest:", error);
     logData.error_message = error.message || String(error);
     logData.response_status_code = logData.response_status_code || 500;
     logData.duration_ms = Date.now() - startTime;
     if (!logData.cache_status) { // Ensure cache_status is set
        logData.cache_status = cacheStatus; // Will be 'BYPASS' or 'MISS' if error occurred before determination
     }
     c.executionCtx.waitUntil(createRequestLog(c.env.DB, logData as RequestLogInput));
     return c.json({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
}

// Placeholder for a more robust Set-Cookie rewriting function
/*
function rewriteSetCookie(cookieHeader: string, targetBaseUrl: URL, proxyBaseUrl: URL): string {
    // This needs to parse each cookie string, identify Domain and Path attributes,
    // and rewrite them according to the proxy setup.
    // E.g., Domain=.origin.com -> Domain=.proxy-host.com (if applicable)
    // Path=/app -> Path=/proxy/http/origin.com/app
    return cookieHeader; // Placeholder
}
*/