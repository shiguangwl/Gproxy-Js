import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers'; // Added for static assets based on user's snippet
import adminRoutes from './routes/admin';
import proxyAppRoutes from './routes/proxy'; // Import the proxy app
import { setupCheckMiddleware } from './middleware/setup-check';
import { authMiddleware, UserPayload } from './middleware/auth';
import { ProxyConfigVariables } from './middleware/config-check';
import { AsyncActionResult } from './services/asyncProcessor';
import { Env } from './db'; // 确保 Env 被正确导入和使用


// Combine all possible variables that might be set by different middlewares/routes
type GlobalVariables = {
     user?: UserPayload;
     proxyConfig?: ProxyConfigVariables['proxyConfig']; // Optional from config-check
     asyncActionResult?: AsyncActionResult; // Optional from proxy route
     isSetupComplete?: boolean; // From setup-check
};


const app = new Hono<{ Bindings: Env, Variables: GlobalVariables }>();

// Apply setup check middleware first for all routes or relevant ones.
app.use('*', setupCheckMiddleware);

// Apply auth middleware to populate c.get('user') if token exists for admin routes.
// This should come after setupCheck, as setup pages don't need auth.
// And before routes that might use c.get('user') or are protected.
app.use('/admin/*', authMiddleware); // Apply specifically to admin routes

app.route('/admin', adminRoutes);
app.route('/', proxyAppRoutes); // Mount the proxy app. It handles /proxy/* internally.

// Serve static assets from 'public' directory
// This part was in the user's desired state for src/index.ts
app.get(
  '/static/*',
  serveStatic({
    root: './',
    manifest: {}, // Provide an empty object to satisfy the type checker
    // Optional: manifest for etags and cache control
    // manifest: manifest,
  })
);
app.get('/favicon.ico', serveStatic({ path: './public/favicon.ico', manifest: {} }));


// Default route or catch-all
app.get('/', (c) => {
  // For now, redirect to admin login or dashboard based on setup/auth
  // This might later be a landing page or the proxy itself if configured as default
  if (!c.get('isSetupComplete')) {
    return c.redirect('/admin/setup');
  }
  // If setup is complete, but no specific route matched,
  // consider redirecting to admin dashboard or a generic info page.
  // For now, let's assume we want to go to admin if no other route hits.
  return c.redirect('/admin/dashboard');
});

export default app;
