// src/middleware/auth.ts
import { MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';
import type { Env as AppBindings } from '../db'; // Renamed for clarity. This type holds DB, JWT_SECRET etc.

export interface UserPayload {
  // Define your JWT payload structure, e.g., userId, username, roles
  id: string; // Example: admin user id or a generic identifier
  // iat, exp will be added by jwt library
}

// Define the Hono environment structure for this middleware
// E in MiddlewareHandler<E> should be of the shape { Bindings: YourEnv, Variables: YourVariables }
type AuthHandlerEnv = {
  Bindings: AppBindings; // Environment bindings from c.env
  Variables: { // Variables accessible via c.set/c.get
    user: UserPayload; // This middleware sets 'user'
  };
};

type ProtectHandlerEnv = {
  Bindings: AppBindings;
  Variables: {
    user?: UserPayload; // This middleware reads 'user', which might not be set
  };
};

export const authMiddleware: MiddlewareHandler<AuthHandlerEnv, '/admin/*' > = async (c, next) => {
  let token: string | undefined;
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Fallback to checking a cookie for JWT
    const cookieHeader = c.req.header('Cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      token = cookies['jwt_token'];
    }
  }

  if (token) {
    const secret = c.env.JWT_SECRET; // c.env is AppBindings
    if (!secret) {
      console.error('JWT_SECRET not configured on the environment.');
      // For protected routes, this would typically lead to an error or redirect
      // For now, we just won't set the user if secret is missing.
      // Or, throw an error to halt if JWT_SECRET is absolutely mandatory for the app to run.
      await next();
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as UserPayload;
      c.set('user', decoded); // c.set uses Variables from AuthHandlerEnv
    } catch (err) {
      // Token is invalid (expired, wrong signature, etc.)
      console.warn('JWT verification failed:', err);
      // Don't set user, let protected routes handle unauthorized access
    }
  }
  await next();
};

// Helper for protected routes (can be used in specific routes)
export const protectRouteMiddleware: MiddlewareHandler<ProtectHandlerEnv> = async (c, next) => {
     const user = c.get('user'); // c.get uses Variables from ProtectHandlerEnv
     if (!user) {
         const currentPath = new URL(c.req.url).pathname;
         // Avoid redirect loops for login page itself
         if (currentPath !== '/admin/login' && currentPath !== '/admin/setup' && !currentPath.startsWith('/admin/api/')) {
              return c.redirect('/admin/login?unauthorized=true');
         } else if (currentPath.startsWith('/admin/api/') && currentPath !== '/admin/api/login' && currentPath !== '/admin/api/setup') {
             return c.json({ error: 'Unauthorized' }, 401);
         }
     }
     await next();
 };