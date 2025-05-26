// src/routes/proxy.ts
import { Hono } from 'hono';
import { Env } from '../db'; // Assuming Env is correctly typed with DB, JWT_SECRET etc.
import { UserPayload } from '../middleware/auth'; // If proxy routes are also auth-protected
import { configCheckMiddleware, ProxyConfigVariables } from '../middleware/config-check';
import { getAsyncActionForRequest, AsyncActionResult } from '../services/asyncProcessor';
import { handleProxiedRequest } from '../services/proxyService';

// Define the combined Variables type for this router
type ProxyRouteVariables = ProxyConfigVariables & {
  user?: UserPayload; // If admin auth is applied to proxy routes too (unlikely for general proxy)
  asyncActionResult?: AsyncActionResult;
};

const proxyApp = new Hono<{ Bindings: Env, Variables: ProxyRouteVariables }>();

// Apply config check middleware to all routes in this proxy app
// This middleware relies on :protocol, :domain, and :path params being present.
proxyApp.use('/proxy/:protocol/:domain/:path{.+}', configCheckMiddleware);
// Note: If you have other middlewares like auth for proxy, apply them here too.

proxyApp.all('/proxy/:protocol/:domain/:path{.+}', async (c) => {
  const proxyConfig = c.get('proxyConfig'); // Set by configCheckMiddleware
  if (!proxyConfig) {
    // Should be caught by configCheckMiddleware, but as a safeguard.
    return c.json({ error: 'Proxy configuration missing.' }, 500);
  }

  // Reconstruct the original URL the client intended to access
  const protocol = c.req.param('protocol');
  const domain = c.req.param('domain');
  const requestPath = c.req.param('path');
  const queryString = new URL(c.req.url).search; // Gets the query string including '?'
  const originalRequestUrl = `${protocol}://${domain}/${requestPath}${queryString}`;

  try {
    const asyncResult = await getAsyncActionForRequest(
      c.env.DB,
      originalRequestUrl,
      proxyConfig.target_url_prefix
    );
    c.set('asyncActionResult', asyncResult); // Store for potential logging or other uses

    if (asyncResult.action === 'direct') {
      console.log(`Direct request for ${originalRequestUrl} due to policy: ${asyncResult.policyName}`);
      // For 'direct', we fetch the originalRequestUrl as is, without going through our proxy's target_url_prefix.
      // We need to be careful about headers. We should probably still strip sensitive CF headers.
      const directRequestHeaders = new Headers(c.req.raw.headers);
      // Minimal header cleaning for direct requests (consider if more is needed)
      ['cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cf-worker'].forEach(h => directRequestHeaders.delete(h));
      
      // Add X-Forwarded-For, X-Forwarded-Host, X-Forwarded-Proto
      const clientIp = c.req.raw.headers.get('cf-connecting-ip') || c.req.raw.headers.get('x-real-ip') || 'unknown';
      directRequestHeaders.set('X-Forwarded-For', clientIp);
      directRequestHeaders.set('X-Forwarded-Host', new URL(c.req.url).host); 
      directRequestHeaders.set('X-Forwarded-Proto', new URL(c.req.url).protocol.replace(':', ''));


      const directResponse = await fetch(originalRequestUrl, {
        method: c.req.method,
        headers: directRequestHeaders,
        body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
        redirect: 'manual', // Important to handle redirects properly
      });
      // For direct responses, we might still want to process redirects to ensure they stay "direct"
      // or if they should be re-evaluated. For now, pass through.
      // Also, cookie domain/path rewriting might be needed if the direct domain is different from proxy host.
      return directResponse;
    } else {
      // Default is 'proxy' or if explicitly set by a policy
      console.log(`Proxied request for ${originalRequestUrl} (Policy: ${asyncResult.policyName || 'Default Proxy'})`);
      return handleProxiedRequest(c, c.req.raw);
    }
  } catch (error) {
    console.error(`Error in proxy route handler for ${originalRequestUrl}:`, error);
    return c.json({ error: 'Failed to process proxy request.', details: (error as Error).message }, 500);
  }
});

export default proxyApp;