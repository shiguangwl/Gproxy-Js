// src/middleware/setup-check.ts
import { MiddlewareHandler } from 'hono';
import { getSetting, Env as AppBindings } from '../db'; // Renamed for clarity

// Define the Hono environment structure for this middleware
type SetupCheckHandlerEnv = {
  Bindings: AppBindings; // Environment bindings from c.env (DB, JWT_SECRET, etc.)
  Variables: {}; // This middleware does not set any context variables via c.set()
};

export const setupCheckMiddleware: MiddlewareHandler<SetupCheckHandlerEnv> = async (c, next) => {
  const adminPasswordHash = await getSetting(c.env.DB, 'admin_password_hash'); // c.env is AppBindings
  const currentPath = new URL(c.req.url).pathname;

  if (!adminPasswordHash) {
    if (currentPath !== '/admin/setup' && !currentPath.startsWith('/admin/api/setup')) { // 允许API调用
      return c.redirect('/admin/setup');
    }
  } else {
    if (currentPath === '/admin/setup') {
      return c.redirect('/admin/login');
    }
  }
  await next();
};