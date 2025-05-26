// src/db/index.ts
import { D1Database, R2Bucket, KVNamespace } from '@cloudflare/workers-types'; // Added R2Bucket and KVNamespace
export type { D1Database, R2Bucket, KVNamespace }; // Export them as types too

// --- Type Definitions ---
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  CACHE_STORE?: R2Bucket | KVNamespace; // Added for caching service
}

export interface Setting {
  key: string;
  value: string;
}

export interface ProxiedTarget {
  id: string;
  target_url_prefix: string;
  is_active: number; // 0 or 1
  enable_js_injection: number; // 0 or 1
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
export type ProxiedTargetInput = Omit<ProxiedTarget, 'id' | 'created_at' | 'updated_at'> & { id?: string };


export interface ReplaceRule {
  id: string;
  name: string;
  is_active: number; // 0 or 1
  search_pattern: string;
  replace_with: string;
  match_type: 'string' | 'regex';
  url_match_regex?: string | null;
  url_exclude_regex?: string | null;
  content_type_match?: string | null;
  order_priority: number;
  created_at: string;
  updated_at: string;
}
export type ReplaceRuleInput = Omit<ReplaceRule, 'id' | 'created_at' | 'updated_at'> & { id?: string };


export interface AsyncPolicy {
  id: string;
  name: string;
  is_active: number; // 0 or 1
  target_url_pattern: string;
  action: 'proxy' | 'direct';
  apply_to_target_prefix?: string | null;
  order_priority: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
export type AsyncPolicyInput = Omit<AsyncPolicy, 'id' | 'created_at' | 'updated_at'> & { id?: string };

export interface HeaderRule {
  id: string;
  name: string;
  is_active: number; // 0 or 1
  rule_phase: 'request' | 'response';
  header_name: string;
  action: 'add' | 'set' | 'remove' | 'append';
  value_pattern?: string | null; // For 'set' or 'append' if action involves matching
  replacement_value?: string | null; // For 'add', 'set', 'append'
  apply_to_target_prefix?: string | null;
  order_priority: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
export type HeaderRuleInput = Omit<HeaderRule, 'created_at' | 'updated_at'> & { id?: string };

export interface ResponseRule {
  id: string;
  name: string;
  is_active: number; // 0 or 1
  match_status_code?: number | null; // e.g., 200, 404. Null means any.
  match_content_type?: string | null; // e.g., 'application/json'. Can use wildcards like 'image/*'. Null means any.
  body_action: 'replace_text' | 'replace_json_field' | 'append_html' | 'prepend_html' | 'replace_html_element' | 'remove_html_element' | 'none';
  body_pattern?: string | null; // Regex for 'replace_text', JSONPath for 'replace_json_field', CSS selector for HTML actions
  body_replacement?: string | null; // Replacement text/JSON value/HTML content
  apply_to_target_prefix?: string | null;
  order_priority: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
export type ResponseRuleInput = Omit<ResponseRule, 'created_at' | 'updated_at'> & { id?: string };

// --- CacheSettings Table Types ---
export interface CacheSetting {
  id: string;
  name: string;
  is_active: number; // 0 or 1
  target_url_pattern: string; // Regex to match original request URL
  cache_duration_seconds: number;
  stale_while_revalidate_seconds?: number | null;
  apply_to_target_prefix?: string | null; // Link to proxied_targets.target_url_prefix
  order_priority: number; // Lower numbers have higher priority
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CacheSettingInput extends Omit<CacheSetting, 'id' | 'created_at' | 'updated_at'> {
  id?: string; // Optional for creation
}

// --- CachedResponses Table Types ---
export interface CachedResponse {
  cache_key: string; // e.g., hash of (target_url_prefix + original_request_url_path_and_query)
  target_url_prefix?: string | null; // For targeted cache clearing
  status_code: number;
  headers: string; // JSON string of headers object
  body_hash: string; // Hash of the response body (useful for etag-like checks, or use actual etag)
  body_storage_key?: string | null; // If body stored in R2/KV, this is the key. Null if body is small and in this table.
  body_inline?: string | null; // For small response bodies, stored directly as base64 or text
  expires_at: string; // ISO 8601 datetime string
  created_at: string;
  // last_validated_at?: string; // For stale-while-revalidate
}

export interface CachedResponseInput extends Omit<CachedResponse, 'created_at' /* | 'last_validated_at' */> {
  // cache_key is required for creation
}
// --- RequestLogs Table Types ---
export interface RequestLog {
  id: string; // UUID
  timestamp: string; // ISO 8601 datetime string
  target_url_prefix?: string | null;
  original_request_url: string;
  request_method: string;
  request_headers: string; // JSON string
  request_body?: string | null; // Text or base64, potentially truncated
  proxied_request_url: string;
  response_status_code?: number | null;
  response_headers?: string | null; // JSON string
  response_body?: string | null; // Text or base64, potentially truncated
  duration_ms: number; // Request-response cycle duration
  cache_status?: 'HIT' | 'MISS' | 'STALE' | 'BYPASS' | null; // Cache interaction status
  error_message?: string | null;
  client_ip?: string | null;
}

export interface RequestLogInput extends Omit<RequestLog, 'id' | 'timestamp'> {
  id?: string; // Optional for creation, will be auto-generated
  timestamp?: string; // Optional for creation, will be auto-generated
}

// --- Helper function for generating IDs ---
function generateId(id?: string): string {
  return id || crypto.randomUUID();
}

// --- Settings Table Functions ---
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const result = await stmt.bind(key).first<Setting>();
  return result?.value ?? null;
}

export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  await stmt.bind(key, value).run();
}

// --- ProxiedTargets Table Functions ---
export async function createProxiedTarget(db: D1Database, data: ProxiedTargetInput): Promise<ProxiedTarget | null> {
  const newId = generateId(data.id);
  const stmt = db.prepare(
    'INSERT INTO proxied_targets (id, target_url_prefix, is_active, enable_js_injection, notes) VALUES (?, ?, ?, ?, ?)'
  );
  await stmt.bind(
     newId,
     data.target_url_prefix,
     data.is_active ?? 1,
     data.enable_js_injection ?? 0,
     data.notes
  ).run();
  return getProxiedTargetById(db, newId);
}

export async function getProxiedTargetById(db: D1Database, id: string): Promise<ProxiedTarget | null> {
  const stmt = db.prepare('SELECT * FROM proxied_targets WHERE id = ?');
  return await stmt.bind(id).first<ProxiedTarget>();
}

export async function updateProxiedTarget(db: D1Database, id: string, data: Partial<Omit<ProxiedTargetInput, 'id'>>): Promise<ProxiedTarget | null> {
    const existing = await getProxiedTargetById(db, id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.target_url_prefix !== undefined) {
        updates.push('target_url_prefix = ?');
        values.push(data.target_url_prefix);
    }
    if (data.is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(data.is_active);
    }
    if (data.enable_js_injection !== undefined) {
        updates.push('enable_js_injection = ?');
        values.push(data.enable_js_injection);
    }
    if (data.notes !== undefined) { // notes can be null
        updates.push('notes = ?');
        values.push(data.notes);
    }

    if (updates.length === 0) return existing; // No changes

    const stmt = db.prepare(`UPDATE proxied_targets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    await stmt.bind(...values, id).run();
    return getProxiedTargetById(db, id);
}

export async function deleteProxiedTarget(db: D1Database, id: string): Promise<boolean> {
  const stmt = db.prepare('DELETE FROM proxied_targets WHERE id = ?');
  const result = await stmt.bind(id).run();
  return result.meta.changes > 0;
}

export async function listProxiedTargets(db: D1Database): Promise<ProxiedTarget[]> {
  const stmt = db.prepare('SELECT * FROM proxied_targets ORDER BY created_at DESC');
  const results = await stmt.all<ProxiedTarget>();
  return results.results || [];
}

export async function findActiveProxiedTargetForUrl(db: D1Database, url: string): Promise<ProxiedTarget | null> {
  const stmt = db.prepare('SELECT * FROM proxied_targets WHERE is_active = 1');
  const activeTargets = (await stmt.all<ProxiedTarget>()).results || [];
  
  let bestMatch: ProxiedTarget | null = null;
  for (const target of activeTargets) {
    if (url.startsWith(target.target_url_prefix)) {
      if (!bestMatch || target.target_url_prefix.length > bestMatch.target_url_prefix.length) {
        bestMatch = target;
      }
    }
  }
  return bestMatch;
}

// --- ReplaceRules Table Functions ---
export async function createReplaceRule(db: D1Database, data: ReplaceRuleInput): Promise<ReplaceRule | null> {
    const newId = generateId(data.id);
    const stmt = db.prepare(
        'INSERT INTO replace_rules (id, name, is_active, search_pattern, replace_with, match_type, url_match_regex, url_exclude_regex, content_type_match, order_priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    await stmt.bind(
        newId,
        data.name,
        data.is_active ?? 1,
        data.search_pattern,
        data.replace_with,
        data.match_type,
        data.url_match_regex,
        data.url_exclude_regex,
        data.content_type_match,
        data.order_priority ?? 0
    ).run();
    return getReplaceRuleById(db, newId);
}

export async function getReplaceRuleById(db: D1Database, id: string): Promise<ReplaceRule | null> {
    const stmt = db.prepare('SELECT * FROM replace_rules WHERE id = ?');
    return await stmt.bind(id).first<ReplaceRule>();
}

export async function updateReplaceRule(db: D1Database, id: string, data: Partial<ReplaceRuleInput>): Promise<ReplaceRule | null> {
    const existing = await getReplaceRuleById(db, id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active); }
    if (data.search_pattern !== undefined) { updates.push('search_pattern = ?'); values.push(data.search_pattern); }
    if (data.replace_with !== undefined) { updates.push('replace_with = ?'); values.push(data.replace_with); }
    if (data.match_type !== undefined) { updates.push('match_type = ?'); values.push(data.match_type); }
    if (data.url_match_regex !== undefined) { updates.push('url_match_regex = ?'); values.push(data.url_match_regex); }
    if (data.url_exclude_regex !== undefined) { updates.push('url_exclude_regex = ?'); values.push(data.url_exclude_regex); }
    if (data.content_type_match !== undefined) { updates.push('content_type_match = ?'); values.push(data.content_type_match); }
    if (data.order_priority !== undefined) { updates.push('order_priority = ?'); values.push(data.order_priority); }

    if (updates.length === 0) return existing;

    const stmt = db.prepare(`UPDATE replace_rules SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    await stmt.bind(...values, id).run();
    return getReplaceRuleById(db, id);
}

export async function deleteReplaceRule(db: D1Database, id: string): Promise<boolean> {
    const stmt = db.prepare('DELETE FROM replace_rules WHERE id = ?');
    const result = await stmt.bind(id).run();
    return result.success;
}

export async function listActiveReplaceRules(db: D1Database): Promise<ReplaceRule[]> {
    const stmt = db.prepare('SELECT * FROM replace_rules WHERE is_active = 1 ORDER BY order_priority ASC');
    const results = await stmt.all<ReplaceRule>();
    return results.results || [];
}

// --- AsyncRequestPolicies Table Functions ---
export async function createAsyncPolicy(db: D1Database, data: AsyncPolicyInput): Promise<AsyncPolicy | null> {
    const newId = generateId(data.id);
    const stmt = db.prepare(
        'INSERT INTO async_request_policies (id, name, is_active, target_url_pattern, action, apply_to_target_prefix, order_priority, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    await stmt.bind(
        newId,
        data.name,
        data.is_active ?? 1,
        data.target_url_pattern,
        data.action,
        data.apply_to_target_prefix,
        data.order_priority ?? 0,
        data.notes
    ).run();
    return getAsyncPolicyById(db, newId);
}

export async function getAsyncPolicyById(db: D1Database, id: string): Promise<AsyncPolicy | null> {
    const stmt = db.prepare('SELECT * FROM async_request_policies WHERE id = ?');
    return await stmt.bind(id).first<AsyncPolicy>();
}

export async function updateAsyncPolicy(db: D1Database, id: string, data: Partial<Omit<AsyncPolicyInput, 'id'>>): Promise<AsyncPolicy | null> {
    const existing = await getAsyncPolicyById(db, id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active); }
    if (data.target_url_pattern !== undefined) { updates.push('target_url_pattern = ?'); values.push(data.target_url_pattern); }
    if (data.action !== undefined) { updates.push('action = ?'); values.push(data.action); }
    if (data.apply_to_target_prefix !== undefined) { updates.push('apply_to_target_prefix = ?'); values.push(data.apply_to_target_prefix); }
    if (data.order_priority !== undefined) { updates.push('order_priority = ?'); values.push(data.order_priority); }
    if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes); }

    if (updates.length === 0) return existing;

    const stmt = db.prepare(`UPDATE async_request_policies SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    await stmt.bind(...values, id).run();
    return getAsyncPolicyById(db, id);
}

export async function deleteAsyncPolicy(db: D1Database, id: string): Promise<boolean> {
    const stmt = db.prepare('DELETE FROM async_request_policies WHERE id = ?');
    const info = await stmt.bind(id).run();
    return info.meta.changes > 0;
}

export async function listActiveAsyncPolicies(db: D1Database, targetPrefix?: string): Promise<AsyncPolicy[]> {
    let query = 'SELECT * FROM async_request_policies WHERE is_active = 1';
    const params: (string | number)[] = []; // D1 bindings can be string or number
    if (targetPrefix) {
        query += ' AND (apply_to_target_prefix = ? OR apply_to_target_prefix IS NULL)';
        params.push(targetPrefix);
    }
    query += ' ORDER BY order_priority ASC';
    
    const stmt = db.prepare(query);
    if (params.length > 0) {
        const results = await stmt.bind(...params).all<AsyncPolicy>();
        return results.results || [];
    } else {
        const results = await stmt.all<AsyncPolicy>();
        return results.results || [];
    }
}

export async function listAsyncPolicies(db: D1Database): Promise<AsyncPolicy[]> {
    const stmt = db.prepare('SELECT * FROM async_request_policies ORDER BY order_priority ASC, name ASC');
    const results = await stmt.all<AsyncPolicy>();
    return results.results || [];
}

// --- HeaderRules Table Functions ---

export async function createHeaderRule(db: D1Database, data: HeaderRuleInput): Promise<HeaderRule | null> {
  const newId = data.id || crypto.randomUUID();
  const stmt = db.prepare(
    'INSERT INTO header_rules (id, name, is_active, rule_phase, header_name, action, value_pattern, replacement_value, apply_to_target_prefix, order_priority, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  await stmt.bind(
    newId, data.name, data.is_active ?? 1, data.rule_phase, data.header_name, data.action,
    data.value_pattern, data.replacement_value, data.apply_to_target_prefix, data.order_priority ?? 0, data.notes
  ).run();
  return getHeaderRuleById(db, newId);
}

export async function getHeaderRuleById(db: D1Database, id: string): Promise<HeaderRule | null> {
  return db.prepare('SELECT * FROM header_rules WHERE id = ?').bind(id).first<HeaderRule>();
}

export async function updateHeaderRule(db: D1Database, id: string, data: Partial<Omit<HeaderRuleInput, 'id'>>): Promise<HeaderRule | null> {
  const fields = Object.keys(data) as Array<keyof typeof data>;
  if (fields.length === 0) return getHeaderRuleById(db, id);
  
  // Filter out undefined values to prevent setting fields to NULL unintentionally
  const validFields = fields.filter(field => data[field] !== undefined);
  if (validFields.length === 0) return getHeaderRuleById(db, id);

  const setClauses = validFields.map(field => `${field} = ?`).join(', ');
  const values = validFields.map(field => data[field]);

  await db.prepare(`UPDATE header_rules SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, id).run();
  return getHeaderRuleById(db, id);
}

export async function deleteHeaderRule(db: D1Database, id: string): Promise<boolean> {
  const info = await db.prepare('DELETE FROM header_rules WHERE id = ?').bind(id).run();
  return info.meta.changes > 0;
}

export async function listActiveHeaderRules(db: D1Database, targetPrefix?: string, rulePhase: 'request' | 'response' = 'request'): Promise<HeaderRule[]> {
  let query = 'SELECT * FROM header_rules WHERE is_active = 1 AND rule_phase = ?';
  const params: (string|number|null)[] = [rulePhase];
  
  if (targetPrefix) {
    query += ' AND (apply_to_target_prefix = ? OR apply_to_target_prefix IS NULL OR apply_to_target_prefix = \'\')';
    params.push(targetPrefix);
  } else {
    query += ' AND (apply_to_target_prefix IS NULL OR apply_to_target_prefix = \'\')';
  }
  query += ' ORDER BY order_priority ASC';
  
  const stmt = db.prepare(query);
  const results = await stmt.bind(...params).all<HeaderRule>();
  return results.results || [];
}

export async function listHeaderRules(db: D1Database): Promise<HeaderRule[]> {
  const stmt = db.prepare('SELECT * FROM header_rules ORDER BY order_priority ASC, name ASC');
  const results = await stmt.all<HeaderRule>();
  return results.results || [];
}

// --- ResponseRules Table Functions ---

export async function createResponseRule(db: D1Database, data: ResponseRuleInput): Promise<ResponseRule | null> {
  const newId = data.id || crypto.randomUUID();
  const stmt = db.prepare(
    'INSERT INTO response_rules (id, name, is_active, match_status_code, match_content_type, body_action, body_pattern, body_replacement, apply_to_target_prefix, order_priority, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  await stmt.bind(
    newId, data.name, data.is_active ?? 1, data.match_status_code, data.match_content_type, data.body_action,
    data.body_pattern, data.body_replacement, data.apply_to_target_prefix, data.order_priority ?? 0, data.notes
  ).run();
  return getResponseRuleById(db, newId);
}

export async function getResponseRuleById(db: D1Database, id: string): Promise<ResponseRule | null> {
  return db.prepare('SELECT * FROM response_rules WHERE id = ?').bind(id).first<ResponseRule>();
}

export async function updateResponseRule(db: D1Database, id: string, data: Partial<Omit<ResponseRuleInput, 'id'>>): Promise<ResponseRule | null> {
  const fields = Object.keys(data) as Array<keyof typeof data>;
  if (fields.length === 0) return getResponseRuleById(db, id);

  // Filter out undefined values to prevent setting fields to NULL unintentionally
  const validFields = fields.filter(field => data[field] !== undefined);
  if (validFields.length === 0) return getResponseRuleById(db, id);

  const setClauses = validFields.map(field => `${field} = ?`).join(', ');
  const values = validFields.map(field => data[field]);

  await db.prepare(`UPDATE response_rules SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, id).run();
  return getResponseRuleById(db, id);
}

export async function deleteResponseRule(db: D1Database, id: string): Promise<boolean> {
  const info = await db.prepare('DELETE FROM response_rules WHERE id = ?').bind(id).run();
  return info.meta.changes > 0;
}

export async function listActiveResponseRules(db: D1Database, targetPrefix?: string): Promise<ResponseRule[]> {
  let query = 'SELECT * FROM response_rules WHERE is_active = 1';
  const params: (string|number|null)[] = [];
  
  if (targetPrefix) {
    query += ' AND (apply_to_target_prefix = ? OR apply_to_target_prefix IS NULL OR apply_to_target_prefix = \'\')';
    params.push(targetPrefix);
  } else {
    query += ' AND (apply_to_target_prefix IS NULL OR apply_to_target_prefix = \'\')';
  }
  query += ' ORDER BY order_priority ASC';
  
  const stmt = db.prepare(query);
  const results = await stmt.bind(...params).all<ResponseRule>();
  return results.results || [];
}

export async function listResponseRules(db: D1Database): Promise<ResponseRule[]> {
  const stmt = db.prepare('SELECT * FROM response_rules ORDER BY order_priority ASC, name ASC');
  const results = await stmt.all<ResponseRule>();
  return results.results || [];
}

// --- CacheSettings Table Functions ---

export async function createCacheSetting(db: D1Database, data: CacheSettingInput): Promise<CacheSetting | null> {
  const newId = data.id || crypto.randomUUID();
  const stmt = db.prepare(
    'INSERT INTO cache_settings (id, name, is_active, target_url_pattern, cache_duration_seconds, stale_while_revalidate_seconds, apply_to_target_prefix, order_priority, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  await stmt.bind(
    newId, data.name, data.is_active ?? 1, data.target_url_pattern, data.cache_duration_seconds,
    data.stale_while_revalidate_seconds, data.apply_to_target_prefix, data.order_priority ?? 0, data.notes
  ).run();
  return getCacheSettingById(db, newId);
}

export async function getCacheSettingById(db: D1Database, id: string): Promise<CacheSetting | null> {
  return db.prepare('SELECT * FROM cache_settings WHERE id = ?').bind(id).first<CacheSetting>();
}

export async function updateCacheSetting(db: D1Database, id: string, data: Partial<Omit<CacheSettingInput, 'id'>>): Promise<CacheSetting | null> {
  const fields = Object.keys(data) as Array<keyof typeof data>;
  if (fields.length === 0) return getCacheSettingById(db, id);
  
  // Filter out undefined values to prevent setting fields to NULL unintentionally
  const validFields = fields.filter(field => data[field] !== undefined);
  if (validFields.length === 0) return getCacheSettingById(db, id);

  const setClauses = validFields.map(field => `${field} = ?`).join(', ');
  const values = validFields.map(field => data[field]);

  await db.prepare(`UPDATE cache_settings SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, id).run();
  return getCacheSettingById(db, id);
}

export async function deleteCacheSetting(db: D1Database, id: string): Promise<boolean> {
  const info = await db.prepare('DELETE FROM cache_settings WHERE id = ?').bind(id).run();
  return info.meta.changes > 0;
}

export async function listActiveCacheSettings(db: D1Database, targetPrefix?: string): Promise<CacheSetting[]> {
  let query = 'SELECT * FROM cache_settings WHERE is_active = 1';
  const params: (string|number)[] = [];
  if (targetPrefix) {
    query += ' AND (apply_to_target_prefix = ? OR apply_to_target_prefix IS NULL OR apply_to_target_prefix = \'\')';
    params.push(targetPrefix);
  } else {
    // If no targetPrefix is specified, we might want settings that are global (NULL or empty apply_to_target_prefix)
    // Or, if the intention is truly *only* for non-prefixed, then this is fine.
    // For now, let's assume it means global rules if no prefix given.
    query += ' AND (apply_to_target_prefix IS NULL OR apply_to_target_prefix = \'\')';
  }
  query += ' ORDER BY order_priority ASC';
  const stmt = db.prepare(query);
  const results = await stmt.bind(...params).all<CacheSetting>();
  return results.results || [];
}

export async function listCacheSettings(db: D1Database): Promise<CacheSetting[]> {
  const stmt = db.prepare('SELECT * FROM cache_settings ORDER BY order_priority ASC, name ASC');
  const results = await stmt.all<CacheSetting>();
  return results.results || [];
}

// --- CachedResponses Table Functions ---

export async function createCachedResponse(db: D1Database, data: CachedResponseInput): Promise<CachedResponse | null> {
  const stmt = db.prepare(
    'INSERT INTO cached_responses (cache_key, target_url_prefix, status_code, headers, body_hash, body_storage_key, body_inline, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  await stmt.bind(
    data.cache_key, data.target_url_prefix, data.status_code, data.headers, data.body_hash,
    data.body_storage_key, data.body_inline, data.expires_at
  ).run();
  return getCachedResponseByKey(db, data.cache_key);
}

export async function getCachedResponseByKey(db: D1Database, cacheKey: string): Promise<CachedResponse | null> {
  return db.prepare('SELECT * FROM cached_responses WHERE cache_key = ?').bind(cacheKey).first<CachedResponse>();
}

export async function deleteCachedResponse(db: D1Database, cacheKey: string): Promise<boolean> {
  const info = await db.prepare('DELETE FROM cached_responses WHERE cache_key = ?').bind(cacheKey).run();
  return info.meta.changes > 0;
}

export async function deleteExpiredCachedResponses(db: D1Database): Promise<number> {
  const now = new Date().toISOString();
  const info = await db.prepare('DELETE FROM cached_responses WHERE expires_at < ?').bind(now).run();
  return info.meta.changes ?? 0;
}

export async function clearAllCache(db: D1Database, targetPrefix?: string): Promise<number> {
  let query = 'DELETE FROM cached_responses';
  const params: string[] = [];
  if (targetPrefix) {
    query += ' WHERE target_url_prefix = ?';
    params.push(targetPrefix);
  }
  const info = await db.prepare(query).bind(...params).run();
  return info.meta.changes ?? 0;
}
// --- RequestLogs Table Functions ---

const MAX_BODY_LOG_LENGTH = 5000; // Max characters to store for request/response bodies

function truncateString(str: string | null | undefined, maxLength: number): string | null {
  if (!str) return null;
  return str.length > maxLength ? str.substring(0, maxLength) + '...[TRUNCATED]' : str;
}

export async function createRequestLog(db: D1Database, data: RequestLogInput): Promise<RequestLog | null> {
  const newId = data.id || crypto.randomUUID();
  const timestamp = data.timestamp || new Date().toISOString();

  const stmt = db.prepare(
    `INSERT INTO request_logs (
      id, timestamp, target_url_prefix, original_request_url, request_method, request_headers, request_body,
      proxied_request_url, response_status_code, response_headers, response_body, duration_ms,
      cache_status, error_message, client_ip
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  await stmt.bind(
    newId, timestamp, data.target_url_prefix, data.original_request_url, data.request_method,
    JSON.stringify(data.request_headers), // Ensure headers are stringified
    truncateString(data.request_body, MAX_BODY_LOG_LENGTH),
    data.proxied_request_url, data.response_status_code,
    data.response_headers ? JSON.stringify(data.response_headers) : null, // Ensure headers are stringified
    truncateString(data.response_body, MAX_BODY_LOG_LENGTH), data.duration_ms,
    data.cache_status, data.error_message, data.client_ip
  ).run();
  
  return getRequestLogById(db, newId);
}

export async function getRequestLogById(db: D1Database, id: string): Promise<RequestLog | null> {
  const result = await db.prepare('SELECT * FROM request_logs WHERE id = ?').bind(id).first<RequestLog>();
  if (result) {
    // Attempt to parse JSON string fields back to objects
    try {
      if (typeof result.request_headers === 'string') {
        result.request_headers = JSON.parse(result.request_headers);
      }
    } catch (e) {
      console.error(`Failed to parse request_headers for log ${id}:`, e);
      // Keep as string if parsing fails
    }
    try {
      if (typeof result.response_headers === 'string') {
        result.response_headers = JSON.parse(result.response_headers);
      }
    } catch (e) {
      console.error(`Failed to parse response_headers for log ${id}:`, e);
      // Keep as string if parsing fails
    }
  }
  return result;
}

export async function listRequestLogs(
  db: D1Database,
  limit: number = 50,
  offset: number = 0,
  targetPrefix?: string
): Promise<{ logs: RequestLog[], total: number }> {
  let query = 'SELECT * FROM request_logs';
  let countQuery = 'SELECT COUNT(*) as total FROM request_logs';
  const params: (string | number)[] = [];
  const countParams: (string | number)[] = [];

  if (targetPrefix) {
    query += ' WHERE target_url_prefix = ?';
    countQuery += ' WHERE target_url_prefix = ?';
    params.push(targetPrefix);
    countParams.push(targetPrefix);
  }

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const logsStmt = db.prepare(query).bind(...params);
  const totalStmt = db.prepare(countQuery).bind(...countParams);

  const [logsResults, totalResult] = await Promise.all([
    logsStmt.all<RequestLog>(),
    totalStmt.first<{ total: number }>()
  ]);
  
  const logs = (logsResults.results || []).map(log => {
    try {
      if (typeof log.request_headers === 'string') {
        log.request_headers = JSON.parse(log.request_headers);
      }
    } catch (e) {
      console.error(`Failed to parse request_headers for log ${log.id} in list:`, e);
    }
    try {
      if (typeof log.response_headers === 'string') {
        log.response_headers = JSON.parse(log.response_headers);
      }
    } catch (e) {
      console.error(`Failed to parse response_headers for log ${log.id} in list:`, e);
    }
    return log;
  });

  return {
    logs: logs,
    total: totalResult?.total || 0,
  };
}

export async function deleteRequestLogsBefore(db: D1Database, timestamp: string): Promise<number> {
  const info = await db.prepare('DELETE FROM request_logs WHERE timestamp < ?').bind(timestamp).run();
  return info.meta.changes ?? 0;
}

export async function clearAllRequestLogs(db: D1Database, targetPrefix?: string): Promise<number> {
  let query = 'DELETE FROM request_logs';
  const params: string[] = [];
  if (targetPrefix) {
    query += ' WHERE target_url_prefix = ?';
    params.push(targetPrefix);
  }
  const info = await db.prepare(query).bind(...params).run();
  return info.meta.changes ?? 0;
}