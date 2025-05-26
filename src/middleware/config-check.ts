// src/middleware/config-check.ts
import { MiddlewareHandler } from 'hono';
import { Env as BindingsType, ProxiedTarget, findActiveProxiedTargetForUrl } from '../db'; // Assuming Env and ProxiedTarget are correctly typed

// Define the expected shape of Variables after this middleware runs
export type ProxyConfigVariables = {
  proxyConfig?: ProxiedTarget;
};

// Define the full environment for this middleware, including Bindings and Variables
type HandlerEnv = {
  Bindings: BindingsType;
  Variables: ProxyConfigVariables;
};

export const configCheckMiddleware: MiddlewareHandler<HandlerEnv> = async (c, next) => {
  // Extract protocol, domain, and path from the request parameters
  // This assumes your proxy route is set up like /proxy/:protocol/:domain/:path*
  const protocol = c.req.param('protocol');
  const domain = c.req.param('domain');
  const requestPath = c.req.param('path'); // This will capture everything after domain

  if (!protocol || !domain) {
    // This case should ideally be caught by route validation if params are mandatory
    console.error('Protocol or domain missing in proxy request params.');
    return c.json({ error: 'Invalid proxy request format: protocol or domain missing.' }, 400);
  }

  // Reconstruct the original target URL prefix that the client intended to access.
  // The findActiveProxiedTargetForUrl function expects a full URL to match against prefixes.
  // So, we construct a "base" of what the user is trying to proxy.
  // Example: if request is /proxy/https/example.com/some/api
  // originalUrlToMatch might be https://example.com or https://example.com/some/api
  // The key is that `target_url_prefix` in DB is like `https://example.com/api`
  // So, we need to construct the *full* original URL the user is trying to access via proxy.
  
  // Get the original query string
  const queryString = c.req.url.split('?')[1] || '';
  const fullOriginalPath = requestPath ? `/${requestPath}${queryString ? '?' + queryString : ''}` : (queryString ? '?' + queryString : '/');
  
  const originalUrlToMatch = `${protocol}://${domain}${fullOriginalPath}`;

  try {
    const proxyConfig = await findActiveProxiedTargetForUrl(c.env.DB, originalUrlToMatch);

    if (proxyConfig) {
      c.set('proxyConfig', proxyConfig);
    } else {
      // No active proxy target found for this URL
      console.warn(`No active proxy target found for URL: ${originalUrlToMatch}`);
      return c.json({ error: 'Proxy target not configured or not active for this URL.' }, 404);
    }
  } catch (error) {
    console.error('Error in configCheckMiddleware while finding proxy target:', error);
    return c.json({ error: 'Server error while checking proxy configuration.' }, 500);
  }

  await next();
};