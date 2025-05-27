// src/routes/admin.ts
import { Hono } from 'hono';
import { SetupPage } from '../views/admin/setup';
import { LoginPage } from '../views/admin/login'; // To be created
import { setupAdminPassword, loginAdmin, changeAdminPassword } from '../services/adminService'; // Import changeAdminPassword
import { Env } from '../db';
import * as db from '../db'; // Import all db functions
import { DashboardPage } from '../views/admin/dashboard';
import { TargetsPage } from '../views/admin/targets';
import { AsyncPoliciesPage } from '../views/admin/async-policies';
import { RulesPage } from '../views/admin/rules'; // Import the raw RulesPage component
import { CachePage } from '../views/admin/cache'; // Import CachePage
import { protectRouteMiddleware, UserPayload } from '../middleware/auth'; // Import protectRouteMiddleware and UserPayload
// import { deleteCookie } from 'hono/cookie'; // For logout if using cookies
import { LogsPage, LogsPageProps } from '../views/admin/logs';
import { SettingsPage } from '../views/admin/settings'; // Import SettingsPage
// Ensure db functions for request_logs are available (already imported via import * as db)
// No need to import 'render' from 'hono/jsx-renderer' here.
// Components defined with jsxRenderer are functions that return JSX elements.
// These can be directly passed to c.html().

// Define types for Hono context variables if they are set by middleware
// This helps with type safety when using c.get() or c.set()
// For example, if authMiddleware sets a 'user' variable:
type AdminVariables = {
  user?: UserPayload // from auth.ts
}
const admin = new Hono<{ Bindings: Env, Variables: AdminVariables }>();
// For now, we'll keep it simple as LoginPage doesn't directly use c.get('user') for rendering
// const admin = new Hono<{ Bindings: Env }>(); // Original line

admin.get('/setup', (c) => {
  const page = SetupPage({ error: null, success: null });
  return c.html(page === null ? '' : page);
});

admin.post('/api/setup', async (c) => {
  const formData = await c.req.formData();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm_password') as string;

  if (!password || password !== confirmPassword) {
    const page = SetupPage({ error: '密码不匹配或为空。', success: null });
    return c.html(page === null ? '' : page, 400);
  }

  try {
    await setupAdminPassword(c.env.DB, password);
    return c.redirect('/admin/login?setup_success=true');
  } catch (error) {
    console.error('Setup error:', error);
    const page = SetupPage({ error: '设置管理员密码失败。', success: null });
    return c.html(page === null ? '' : page, 500);
  }
});

admin.get('/login', (c) => {
  // Check for query params like setup_success or unauthorized
  const setupSuccess = c.req.query('setup_success') === 'true';
  const unauthorized = c.req.query('unauthorized') === 'true';
  let message: string | null = null;
  if (setupSuccess) message = '管理员密码设置成功！请登录。';
  if (unauthorized) message = '您需要登录才能访问此页面。';
  
  const page = LoginPage({ error: null, message: message });
  return c.html(page === null ? '' : page);
});

admin.post('/api/login', async (c) => {
  const formData = await c.req.formData();
  const password = formData.get('password') as string;
  // Username might be fixed to 'admin' or also from form
  // const username = formData.get('username') as string;

  if (!password) { // Add username validation if used
    const page = LoginPage({ error: '请输入密码。', message: null });
    return c.html(page === null ? '' : page, 400);
  }

  const secret = c.env.JWT_SECRET;
  if (!secret) {
     console.error('JWT_SECRET not configured for login.');
     const page = LoginPage({ error: '服务器配置错误。', message: null });
     return c.html(page === null ? '' : page, 500);
  }

  try {
    const token = await loginAdmin(c.env.DB, password, secret); // Pass secret to loginAdmin
    if (token) {
      // Option 1: Return token in JSON response for client to handle
      return c.json({ token, message: '登录成功，正在跳转...' });

      // Option 2: Set as HttpOnly cookie (requires hono/cookie middleware)
      // import { setCookie } from 'hono/cookie';
      // setCookie(c, 'jwt_token', token, {
      //   httpOnly: true,
      //   secure: new URL(c.req.url).protocol === 'https:', // Secure in HTTPS
      //   sameSite: 'Lax',
      //   path: '/admin', // Or '/'
      //   maxAge: 60 * 60 * 24 // 1 day example
      // });
      // return c.redirect('/admin/dashboard');
      
    } else {
      const page = LoginPage({ error: '用户名或密码无效。', message: null });
      return c.html(page === null ? '' : page, 401);
    }
  } catch (error) {
    console.error('Login error:', error);
    const page = LoginPage({ error: '登录过程中发生错误。', message: null });
    return c.html(page === null ? '' : page, 500);
  }
});

// Group for protected routes
const protectedAdmin = admin.use('/*', protectRouteMiddleware); // Apply to all subsequent routes in this Hono instance or a sub-router

protectedAdmin.get('/dashboard', (c) => {
  const user = c.get('user'); // User should be set by authMiddleware + protectRouteMiddleware
  const pageComponent = DashboardPage({ user });
  // Ensure that we don't pass null to c.html, as FC can technically return null.
  return c.html(pageComponent === null ? '' : pageComponent);
});

protectedAdmin.get('/targets', async (c) => {
  const user = c.get('user');
  // Optionally fetch initial targets for SSR, or let client script handle it
  // const targets = await db.listProxiedTargets(c.env.DB);
  // When passing a component directly, Hono expects it to be a function that returns JSX.
  // If TargetsPage is an FC, it fits this.
  const targetsPageComponent = TargetsPage({ user /*, targetsInitial: targets */ });
  return c.html(targetsPageComponent === null ? '' : targetsPageComponent);
});

// API routes for Proxied Targets
protectedAdmin.get('/api/targets', async (c) => {
  try {
    const targets = await db.listProxiedTargets(c.env.DB);
    return c.json(targets);
  } catch (e) {
    console.error("Failed to list targets:", e);
    return c.json({ error: "Failed to fetch targets" }, 500);
  }
});

protectedAdmin.post('/api/targets', async (c) => {
  try {
    const body = await c.req.json<db.ProxiedTargetInput>();
    if (!body.target_url_prefix) {
      return c.json({ error: 'Target URL prefix is required' }, 400);
    }
    // Basic URL validation (more robust validation might be needed)
    try {
         new URL(body.target_url_prefix);
    } catch (urlError) {
         return c.json({ error: 'Invalid Target URL prefix format' }, 400);
    }

    const newTarget = await db.createProxiedTarget(c.env.DB, {
         ...body,
         is_active: Number(body.is_active ?? 1),
         enable_js_injection: Number(body.enable_js_injection ?? 0),
    });
    if (!newTarget) {
      return c.json({ error: 'Failed to create target' }, 500);
    }
    return c.json(newTarget, 201);
  } catch (e) {
    console.error("Failed to create target:", e);
    // Check for unique constraint violation (SQLite error code for unique constraint is 19, SQLITE_CONSTRAINT)
    // D1 might return a specific error structure or message.
    if (e instanceof Error && e.message?.includes('UNIQUE constraint failed')) {
         return c.json({ error: 'Target URL prefix must be unique.' }, 409); // Conflict
    }
    return c.json({ error: 'Failed to create target. Ensure prefix is unique.' }, 500);
  }
});

protectedAdmin.get('/api/targets/:id', async (c) => {
     const id = c.req.param('id');
     try {
         const target = await db.getProxiedTargetById(c.env.DB, id);
         if (!target) {
             return c.json({ error: 'Target not found' }, 404);
         }
         return c.json(target);
     } catch (e) {
         console.error(`Failed to get target ${id}:`, e);
         return c.json({ error: 'Failed to fetch target' }, 500);
     }
 });

protectedAdmin.put('/api/targets/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<Partial<Omit<db.ProxiedTargetInput, 'id'>>>();
     if (body.target_url_prefix) {
         try { new URL(body.target_url_prefix); } catch (urlError) {
             return c.json({ error: 'Invalid Target URL prefix format' }, 400);
         }
     }

    const updatedTarget = await db.updateProxiedTarget(c.env.DB, id, {
         ...body,
         // Ensure boolean-like numbers are correctly handled if present in body
         is_active: body.is_active !== undefined ? Number(body.is_active) : undefined,
         enable_js_injection: body.enable_js_injection !== undefined ? Number(body.enable_js_injection) : undefined,
    });
    if (!updatedTarget) {
      return c.json({ error: 'Target not found or failed to update' }, 404);
    }
    return c.json(updatedTarget);
  } catch (e) {
    console.error(`Failed to update target ${id}:`, e);
     if (e instanceof Error && e.message?.includes('UNIQUE constraint failed')) {
         return c.json({ error: 'Target URL prefix must be unique.' }, 409);
    }
    return c.json({ error: 'Failed to update target. Ensure prefix is unique.' }, 500);
  }
});

protectedAdmin.delete('/api/targets/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const success = await db.deleteProxiedTarget(c.env.DB, id);
    if (!success) {
      return c.json({ error: 'Target not found or failed to delete' }, 404);
    }
    return c.json({ message: 'Target deleted successfully' });
  } catch (e) {
    console.error(`Failed to delete target ${id}:`, e);
    return c.json({ error: 'Failed to delete target' }, 500);
  }
});

// Admin page for Async Policies
protectedAdmin.get('/async-policies', async (c) => {
  const user = c.get('user');
  // Fetch initial data for SSR or to pass to the component
  // const policies = await db.listAsyncPolicies(c.env.DB); // Or listActiveAsyncPolicies
  // const proxiedTargets = await db.listProxiedTargets(c.env.DB);
  // Ensure render is not needed here if AsyncPoliciesPage is a direct FC returning JSX
  // AsyncPoliciesPage is now a standard FC.
  // Call it with props, and pass the returned JSX to c.html().
  const pageContent = AsyncPoliciesPage({ user /*, policiesInitial: policies, proxiedTargets */ });
  // FC can return null, ensure c.html receives a valid string or JSX.
  return c.html(pageContent === null ? '' : pageContent);
});

// API routes for Async Policies
protectedAdmin.get('/api/async-policies', async (c) => {
  try {
    // For the admin page, we probably want to list all policies, not just active ones
    // Let's assume a function listAsyncPolicies exists or adapt listActiveAsyncPolicies
    const policies = await db.listAsyncPolicies(c.env.DB); // You might need to create this if it doesn't exist
    return c.json(policies);
  } catch (e) {
    console.error("Failed to list async policies:", e);
    return c.json({ error: "Failed to fetch async policies" }, 500);
  }
});

protectedAdmin.post('/api/async-policies', async (c) => {
  try {
    const body = await c.req.json<db.AsyncPolicyInput>();
    if (!body.name || !body.target_url_pattern || !body.action) {
      return c.json({ error: 'Name, target URL pattern, and action are required' }, 400);
    }
    // Add regex validation for target_url_pattern if needed client-side/server-side
    const newPolicy = await db.createAsyncPolicy(c.env.DB, {
         ...body,
         is_active: Number(body.is_active ?? 1),
         order_priority: Number(body.order_priority ?? 0),
         apply_to_target_prefix: body.apply_to_target_prefix || undefined, // Store undefined as NULL
    });
    if (!newPolicy) {
      return c.json({ error: 'Failed to create async policy' }, 500);
    }
    return c.json(newPolicy, 201);
  } catch (e: any) {
    console.error("Failed to create async policy:", e);
     if (e.message?.includes('UNIQUE constraint failed')) { // For 'name' field
         return c.json({ error: 'Policy name must be unique.' }, 409);
    }
    return c.json({ error: 'Failed to create async policy. Ensure name is unique.' }, 500);
  }
});

protectedAdmin.get('/api/async-policies/:id', async (c) => {
     const id = c.req.param('id');
     try {
         const policy = await db.getAsyncPolicyById(c.env.DB, id);
         if (!policy) {
             return c.json({ error: 'Async policy not found' }, 404);
         }
         return c.json(policy);
     } catch (e) {
         console.error(`Failed to get async policy ${id}:`, e);
         return c.json({ error: 'Failed to fetch async policy' }, 500);
     }
 });

protectedAdmin.put('/api/async-policies/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<Partial<Omit<db.AsyncPolicyInput, 'id'>>>();
    const updatedPolicy = await db.updateAsyncPolicy(c.env.DB, id, {
         ...body,
         is_active: body.is_active !== undefined ? Number(body.is_active) : undefined,
         order_priority: body.order_priority !== undefined ? Number(body.order_priority) : undefined,
         apply_to_target_prefix: body.apply_to_target_prefix === '' ? undefined : body.apply_to_target_prefix,
    });
    if (!updatedPolicy) {
      return c.json({ error: 'Async policy not found or failed to update' }, 404);
    }
    return c.json(updatedPolicy);
  } catch (e: any) {
    console.error(`Failed to update async policy ${id}:`, e);
    if (e.message?.includes('UNIQUE constraint failed')) {
         return c.json({ error: 'Policy name must be unique.' }, 409);
    }
    return c.json({ error: 'Failed to update async policy. Ensure name is unique.' }, 500);
  }
});

protectedAdmin.delete('/api/async-policies/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const success = await db.deleteAsyncPolicy(c.env.DB, id);
    if (!success) {
      return c.json({ error: 'Async policy not found or failed to delete' }, 404);
    }
    return c.json({ message: 'Async policy deleted successfully' });
  } catch (e) {
    console.error(`Failed to delete async policy ${id}:`, e);
    return c.json({ error: 'Failed to delete async policy' }, 500);
  }
});

// Admin page for Rules
protectedAdmin.get('/rules', async (c) => {
  const user = c.get('user');
  // Fetch initial data for SSR or to pass to the component
  // const headerRules = await db.listHeaderRules(c.env.DB);
  // const responseRules = await db.listResponseRules(c.env.DB);
  // const proxiedTargets = await db.listProxiedTargets(c.env.DB);
  
  // Directly call the component and pass its JSX to c.html()
  const pageContent = RulesPage({
    user,
    // headerRulesInitial: headerRules, // These will be fetched client-side for now
    // responseRulesInitial: responseRules,
    // proxiedTargets
  });
  // Ensure pageContent is not null if RulesPage can return null (though unlikely for a page component)
  return c.html(pageContent === null ? '' : pageContent);
});

// API routes for Header Rules
protectedAdmin.get('/api/header-rules', async (c) => {
  try {
    const rules = await db.listHeaderRules(c.env.DB); // Assumes this function exists
    return c.json(rules);
  } catch (e) {
    console.error("Failed to list header rules:", e);
    return c.json({ error: "Failed to fetch header rules" }, 500);
  }
});

protectedAdmin.post('/api/header-rules', async (c) => {
  try {
    const body = await c.req.json<db.HeaderRuleInput>();
    // Add validation for body content here if necessary
    if (!body.name || !body.header_name || !body.action || !body.rule_phase) {
        return c.json({ error: 'Missing required fields for header rule (name, header_name, action, rule_phase)' }, 400);
    }
    const newRule = await db.createHeaderRule(c.env.DB, {
        ...body,
        is_active: Number(body.is_active ?? 1),
        order_priority: Number(body.order_priority ?? 0),
    });
    if (!newRule) {
      return c.json({ error: 'Failed to create header rule' }, 500);
    }
    return c.json(newRule, 201);
  } catch (e: any) {
    console.error("Failed to create header rule:", e);
    if (e.message?.includes('UNIQUE constraint failed')) {
         return c.json({ error: 'Header rule name must be unique.' }, 409);
    }
    return c.json({ error: 'Failed to create header rule. Ensure name is unique.' }, 500);
  }
});

protectedAdmin.get('/api/header-rules/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const rule = await db.getHeaderRuleById(c.env.DB, id); // Assumes this function exists
    if (!rule) {
      return c.json({ error: 'Header rule not found' }, 404);
    }
    return c.json(rule);
  } catch (e) {
    console.error(`Failed to get header rule ${id}:`, e);
    return c.json({ error: 'Failed to fetch header rule' }, 500);
  }
});

protectedAdmin.put('/api/header-rules/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<Partial<Omit<db.HeaderRuleInput, 'id'>>>();
    const updatedRule = await db.updateHeaderRule(c.env.DB, id, { // Assumes this function exists
        ...body,
        is_active: body.is_active !== undefined ? Number(body.is_active) : undefined,
        order_priority: body.order_priority !== undefined ? Number(body.order_priority) : undefined,
    });
    if (!updatedRule) {
      return c.json({ error: 'Header rule not found or failed to update' }, 404);
    }
    return c.json(updatedRule);
  } catch (e: any) {
    console.error(`Failed to update header rule ${id}:`, e);
     if (e.message?.includes('UNIQUE constraint failed')) {
         return c.json({ error: 'Header rule name must be unique.' }, 409);
    }
    return c.json({ error: 'Failed to update header rule. Ensure name is unique.' }, 500);
  }
});

protectedAdmin.delete('/api/header-rules/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const success = await db.deleteHeaderRule(c.env.DB, id); // Assumes this function exists
    if (!success) {
      return c.json({ error: 'Header rule not found or failed to delete' }, 404);
    }
    return c.json({ message: 'Header rule deleted successfully' });
  } catch (e) {
    console.error(`Failed to delete header rule ${id}:`, e);
    return c.json({ error: 'Failed to delete header rule' }, 500);
  }
});

// API routes for Response Rules
protectedAdmin.get('/api/response-rules', async (c) => {
  try {
    const rules = await db.listResponseRules(c.env.DB); // Assumes this function exists
    return c.json(rules);
  } catch (e) {
    console.error("Failed to list response rules:", e);
    return c.json({ error: "Failed to fetch response rules" }, 500);
  }
});

protectedAdmin.post('/api/response-rules', async (c) => {
  try {
    const body = await c.req.json<db.ResponseRuleInput>();
    // Add validation for body content here if necessary
     if (!body.name) { // Add more required fields as per your schema
        return c.json({ error: 'Missing required fields for response rule (name)' }, 400);
    }
    const newRule = await db.createResponseRule(c.env.DB, { // Assumes this function exists
        ...body,
        is_active: Number(body.is_active ?? 1),
        order_priority: Number(body.order_priority ?? 0),
    });
    if (!newRule) {
      return c.json({ error: 'Failed to create response rule' }, 500);
    }
    return c.json(newRule, 201);
  } catch (e: any) {
    console.error("Failed to create response rule:", e);
    if (e.message?.includes('UNIQUE constraint failed')) {
         return c.json({ error: 'Response rule name must be unique.' }, 409);
    }
    return c.json({ error: 'Failed to create response rule. Ensure name is unique.' }, 500);
  }
});

protectedAdmin.get('/api/response-rules/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const rule = await db.getResponseRuleById(c.env.DB, id); // Assumes this function exists
    if (!rule) {
      return c.json({ error: 'Response rule not found' }, 404);
    }
    return c.json(rule);
  } catch (e) {
    console.error(`Failed to get response rule ${id}:`, e);
    return c.json({ error: 'Failed to fetch response rule' }, 500);
  }
});

protectedAdmin.put('/api/response-rules/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<Partial<Omit<db.ResponseRuleInput, 'id'>>>();
    const updatedRule = await db.updateResponseRule(c.env.DB, id, { // Assumes this function exists
        ...body,
        is_active: body.is_active !== undefined ? Number(body.is_active) : undefined,
        order_priority: body.order_priority !== undefined ? Number(body.order_priority) : undefined,
    });
    if (!updatedRule) {
      return c.json({ error: 'Response rule not found or failed to update' }, 404);
    }
    return c.json(updatedRule);
  } catch (e: any) {
    console.error(`Failed to update response rule ${id}:`, e);
    if (e.message?.includes('UNIQUE constraint failed')) {
         return c.json({ error: 'Response rule name must be unique.' }, 409);
    }
    return c.json({ error: 'Failed to update response rule. Ensure name is unique.' }, 500);
  }
});

protectedAdmin.delete('/api/response-rules/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const success = await db.deleteResponseRule(c.env.DB, id); // Assumes this function exists
    if (!success) {
      return c.json({ error: 'Response rule not found or failed to delete' }, 404);
    }
    return c.json({ message: 'Response rule deleted successfully' });
  } catch (e) {
    console.error(`Failed to delete response rule ${id}:`, e);
    return c.json({ error: 'Failed to delete response rule' }, 500);
  }
});


// Admin page for Cache Management
protectedAdmin.get('/cache', async (c) => {
  const user = c.get('user');
  try {
    const proxiedTargets = await db.listProxiedTargets(c.env.DB);
    const cacheSettings = await db.listCacheSettings(c.env.DB);
    // Call the FC, it returns JSX. Ensure it's not null.
    const pageComponent = CachePage({ user, proxiedTargets, cacheSettingsInitial: cacheSettings });
    return c.html(pageComponent === null ? '' : pageComponent);
  } catch (e: any) {
    console.error("Error fetching data for cache page:", e);
    const errorMsg = e instanceof Error ? e.message : String(e);
    // Call the FC with error info. Ensure it's not null.
    const pageComponent = CachePage({ user, proxiedTargets: [], cacheSettingsInitial: [], error: errorMsg });
    return c.html(pageComponent === null ? '' : pageComponent, 500);
  }
});

// API for Cache Settings
protectedAdmin.get('/api/cache-settings', async (c) => {
  try {
    const settings = await db.listCacheSettings(c.env.DB);
    return c.json(settings);
  } catch (e) {
    console.error("Failed to list cache settings:", e);
    return c.json({ error: "Failed to fetch cache settings" }, 500);
  }
});

protectedAdmin.post('/api/cache-settings', async (c) => {
  try {
    const data = await c.req.json<db.CacheSettingInput>();
    // TODO: Add validation for data
    if (!data.name || !data.target_url_pattern || data.cache_duration_seconds === undefined) {
        return c.json({ error: 'Missing required fields: name, target_url_pattern, cache_duration_seconds' }, 400);
    }
    const setting = await db.createCacheSetting(c.env.DB, data);
    return setting ? c.json(setting, 201) : c.json({ error: 'Failed to create cache setting' }, 500);
  } catch (e: any) {
    console.error("Failed to create cache setting:", e);
    if (e.message?.includes('UNIQUE constraint failed')) {
         return c.json({ error: 'Cache setting name must be unique.' }, 409);
    }
    return c.json({ error: 'Failed to create cache setting' }, 500);
  }
});

protectedAdmin.get('/api/cache-settings/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const setting = await db.getCacheSettingById(c.env.DB, id);
    return setting ? c.json(setting) : c.json({ error: 'Cache setting not found' }, 404);
  } catch (e) {
    console.error(`Failed to get cache setting ${id}:`, e);
    return c.json({ error: 'Failed to fetch cache setting' }, 500);
  }
});

protectedAdmin.put('/api/cache-settings/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const data = await c.req.json<Partial<db.CacheSettingInput>>();
    // TODO: Add validation for data
    const setting = await db.updateCacheSetting(c.env.DB, id, data);
    return setting ? c.json(setting) : c.json({ error: 'Failed to update cache setting or not found' }, 404);
  } catch (e: any) {
    console.error(`Failed to update cache setting ${id}:`, e);
    if (e.message?.includes('UNIQUE constraint failed')) {
         return c.json({ error: 'Cache setting name must be unique if provided.' }, 409);
    }
    return c.json({ error: 'Failed to update cache setting' }, 500);
  }
});

protectedAdmin.delete('/api/cache-settings/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const success = await db.deleteCacheSetting(c.env.DB, id);
    return success ? c.json({ message: 'Cache setting deleted' }) : c.json({ error: 'Failed to delete cache setting or not found' }, 404);
  } catch (e) {
    console.error(`Failed to delete cache setting ${id}:`, e);
    return c.json({ error: 'Failed to delete cache setting' }, 500);
  }
});

// API for Cache Management
protectedAdmin.delete('/api/cache/expired', async (c) => {
  try {
    const deletedCount = await db.deleteExpiredCachedResponses(c.env.DB);
    return c.json({ message: 'Expired cache entries cleared.', deletedCount });
  } catch (e) {
    console.error("Failed to delete expired cache:", e);
    return c.json({ error: 'Failed to clear expired cache' }, 500);
  }
});

protectedAdmin.delete('/api/cache/target/:prefix', async (c) => {
  try {
    const prefix = decodeURIComponent(c.req.param('prefix'));
    if (!prefix) {
        return c.json({ error: 'Target prefix is required.' }, 400);
    }
    // Corrected to use db.clearAllCache with prefix as per initial instruction context
    const deletedCount = await db.clearAllCache(c.env.DB, prefix);
    return c.json({ message: `Cache cleared for target prefix: ${prefix}.`, deletedCount });
  } catch (e) {
    console.error("Failed to clear cache by target prefix:", e);
    return c.json({ error: 'Failed to clear cache for target prefix' }, 500);
  }
});

protectedAdmin.delete('/api/cache/all', async (c) => {
  try {
    const deletedCount = await db.clearAllCache(c.env.DB); // Assumes this clears all cache entries
    return c.json({ message: 'Entire cache cleared.', deletedCount });
  } catch (e) {
    console.error("Failed to clear all cache:", e);
    return c.json({ error: 'Failed to clear entire cache' }, 500);
  }
});
// Logs Page
protectedAdmin.get('/logs', async (c) => {
  const user = c.get('user');
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = 20; // Items per page
  const offset = (page - 1) * limit;
  const filterTargetPrefix = c.req.query('target_prefix') || undefined;

  const { logs, total } = await db.listRequestLogs(c.env.DB, limit, offset, filterTargetPrefix);
  const proxiedTargets = await db.listProxiedTargets(c.env.DB); // For filter dropdown

  // LogsPage is already a renderer instance.
  // We need to render the component *inside* the jsxRenderer structure.
  // The jsxRenderer itself is what c.html expects if the component isn't pre-rendered.
  // However, the structure `export const LogsPage = jsxRenderer((props) => <DefaultLayout>...</DefaultLayout>)`
  // means LogsPage *is* the renderer.
  // We should pass the props to the component that jsxRenderer wraps.
  // The issue is that `LogsPage` is the result of `jsxRenderer`, not the component function itself.
  // Let's try to call it as if it's a Hono handler that renders JSX.
  // The `jsxRenderer` should be applied at a higher level or the component needs to be a simple FC.

  // Given: export const LogsPage = jsxRenderer((props: PropsWithChildren<LogsPageProps>) => { ... });
  // This means LogsPage is a Hono middleware that will render.
  // We should not call LogsPage({...}) directly inside c.html().
  // Instead, the route handler should return the result of LogsPage.
  // However, the route handler IS the place where we prepare props.

  // Correct approach for a component defined with `const MyComponent = jsxRenderer((props) => {...})`
  // is to use it as `c.html(MyComponent({prop1: value1}))` if MyComponent is the *function* passed to jsxRenderer.
  // But here, LogsPage *is* the result of jsxRenderer.

  // Let's assume LogsPage is intended to be a standard FC and jsxRenderer is applied by Hono.
  // The error "Expected 2 arguments, but got 1" for LogsPage suggests it's being treated as a Hono handler.
  // The `jsxRenderer` function takes the component as its first argument, and optionally a `docType` and `stream` option.
  // `export const LogsPage = jsxRenderer((props: PropsWithChildren<LogsPageProps>) => { ... });`
  // This means `LogsPage` is a Hono specific renderer function.
  // We should be able to pass the JSX directly.

  // The issue might be how jsxRenderer is used.
  // If LogsPage is `jsxRenderer(ActualComponentToRender)`, then `c.html(ActualComponentToRender(props))`
  // If LogsPage is `const ActualComponent = (props) => <JSX...>; export const LogsPage = jsxRenderer(ActualComponent)`
  // Then `c.html(ActualComponent(props))`
  // If LogsPage is `export const LogsPage = jsxRenderer((props) => <JSX...>)`, then it's a bit tricky.
  // This means LogsPage is a function that takes (props, context) and returns a Response.

  // Let's try to provide the component directly to c.html
  const propsForLogsPage: LogsPageProps = { // LogsPageProps should be imported from ../views/admin/logs
    user,
    logsInitial: logs,
    totalLogs: total,
    currentPage: page,
    limit,
    proxiedTargets,
    filterTargetPrefix,
    // children: undefined // PropsWithChildren adds children, but we might not need to pass it explicitly
  };

  // When a component is defined as `export const Comp = jsxRenderer((props) => <JSX />)`,
  // LogsPage is now a standard FC. We render it within c.html()
  const pageElement = LogsPage(propsForLogsPage);
  // c.html can take JSX directly. If pageElement is null (though FC<P> usually returns JSX.Element | null),
  // Hono might handle it, or we ensure it's valid.
  // An FC<P> returns JSX.Element | null.
  // c.html() expects HtmlEscapedString | Promise<HtmlEscapedString> or a component that renders to string.
  if (pageElement === null) {
    return c.html(''); // Or handle as an error, though an FC returning null is valid for "render nothing"
  }
  return c.html(pageElement);
});

// API for Logs
protectedAdmin.get('/api/logs', async (c) => {
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = (page - 1) * limit;
    const targetPrefix = c.req.query('target_prefix') || undefined;
    try {
        const data = await db.listRequestLogs(c.env.DB, limit, offset, targetPrefix);
        return c.json(data);
    } catch (e) {
        console.error("Failed to list request logs:", e);
        return c.json({ error: "Failed to fetch request logs" }, 500);
    }
});
protectedAdmin.get('/api/logs/:id', async (c) => {
    const id = c.req.param('id');
    try {
        const log = await db.getRequestLogById(c.env.DB, id);
        return log ? c.json(log) : c.json({ error: 'Log not found' }, 404);
    } catch (e) {
        console.error(`Failed to get request log ${id}:`, e);
        return c.json({ error: 'Failed to fetch log' }, 500);
    }
});

protectedAdmin.delete('/api/logs/before/:date', async (c) => {
    const date = decodeURIComponent(c.req.param('date')); // Expect YYYY-MM-DD
    // D1 expects ISO8601 format for datetime comparisons.
    // We should ensure the timestamp comparison is correct.
    // If 'date' is just YYYY-MM-DD, it implies the start of that day.
    // To delete logs *before* YYYY-MM-DD, we compare against YYYY-MM-DD 00:00:00.
    let isoTimestamp;
    try {
        isoTimestamp = new Date(date).toISOString();
    } catch (e) {
        return c.json({ error: "Invalid date format. Please use YYYY-MM-DD." }, 400);
    }
    
    try {
        const deletedCount = await db.deleteRequestLogsBefore(c.env.DB, isoTimestamp);
        return c.json({ message: `Logs before ${date} (exclusive) cleared.`, deletedCount });
    } catch (e) {
        console.error(`Failed to delete logs before ${date}:`, e);
        return c.json({ error: `Failed to delete logs before ${date}` }, 500);
    }
});
protectedAdmin.delete('/api/logs/target/:prefix', async (c) => {
    const prefix = decodeURIComponent(c.req.param('prefix'));
    try {
        // Assuming clearAllRequestLogs can take an optional prefix
        // Assuming clearRequestLogsByTargetPrefix is similar to clearAllRequestLogs but with a prefix
        // This function might need to be added to src/db/index.ts
        const deletedCount = await db.clearAllRequestLogs(c.env.DB, prefix);
        return c.json({ message: `Logs cleared for target prefix: ${prefix}.`, deletedCount });
    } catch (e) {
        console.error(`Failed to clear logs for prefix ${prefix}:`, e);
        return c.json({ error: `Failed to clear logs for prefix ${prefix}` }, 500);
    }
});
protectedAdmin.delete('/api/logs/all', async (c) => {
    try {
        const deletedCount = await db.clearAllRequestLogs(c.env.DB); // This function might need to be created or confirmed in db/index.ts
        return c.json({ message: 'All logs cleared.', deletedCount });
    } catch (e) {
        console.error("Failed to clear all logs:", e);
        return c.json({ error: "Failed to clear all logs" }, 500);
    }
});

// Add Settings page route
protectedAdmin.get('/settings', async (c) => {
  const user = c.get('user');
  const error = c.req.query('error');
  const success = c.req.query('success');
  
  const pageComponent = SettingsPage({ user, error, success });
  return c.html(pageComponent === null ? '' : pageComponent);
});

// API route for changing admin password
protectedAdmin.post('/api/settings/change-password', async (c) => {
  try {
    const formData = await c.req.formData();
    const currentPassword = formData.get('current_password') as string;
    const newPassword = formData.get('new_password') as string;
    const confirmNewPassword = formData.get('confirm_new_password') as string;
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return c.json({ error: '所有字段都是必填的' }, 400);
    }
    
    if (newPassword !== confirmNewPassword) {
      return c.json({ error: '新密码与确认密码不匹配' }, 400);
    }
    
    const success = await changeAdminPassword(c.env.DB, currentPassword, newPassword);
    if (success) {
      return c.json({ message: '密码修改成功' });
    } else {
      return c.json({ error: '密码修改失败' }, 500);
    }
  } catch (error: any) {
    console.error('Password change error:', error);
    return c.json({ error: error.message || '修改密码时发生错误' }, 400);
  }
});

// Example Logout Route (can be a POST or GET depending on preference)
admin.get('/api/logout', (c) => {
     // If using cookies for JWT, clear the cookie here
     // import { deleteCookie } from 'hono/cookie'; // Make sure to import if used
     // deleteCookie(c, 'jwt_token', { path: '/admin' }); // Or '/'
     // For localStorage/sessionStorage, client-side needs to clear it.
     // This route mainly serves as a signal or for server-side session clearing if any.
     return c.redirect('/admin/login?logged_out=true');
});

export default admin;