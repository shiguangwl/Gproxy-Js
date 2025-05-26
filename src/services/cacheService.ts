// src/services/cacheService.ts
import { D1Database, CacheSetting, CachedResponse, listActiveCacheSettings, getCachedResponseByKey, createCachedResponse, deleteCachedResponse, Env, CachedResponseInput } from '../db'; // Env is in ../db
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types'; // Ensure these types are available

const CACHE_NAMESPACE = 'gproxy-cache::'; // For KV store if used

export async function generateCacheKey(requestUrl: string, targetPrefix?: string): Promise<string> {
  const fullUrl = (targetPrefix || '') + requestUrl;
  const encoder = new TextEncoder();
  const data = encoder.encode(fullUrl);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getBodyFromStorage(storageKey: string, store: R2Bucket | KVNamespace): Promise<ArrayBuffer | null> {
     if ('get' in store && typeof store.get === 'function') { // KVNamespace
         const value = await (store as KVNamespace).get(CACHE_NAMESPACE + storageKey, { type: 'arrayBuffer' });
         return value;
     } else if ('get' in store && typeof store.get === 'function') { // R2Bucket (this check is simplified, R2 get returns R2Object)
         const r2Object = await (store as R2Bucket).get(storageKey);
         if (r2Object === null) return null;
         return r2Object.arrayBuffer();
     }
     console.error("Cache store not configured or type unknown for getBodyFromStorage");
     return null;
}

async function storeBodyInStorage(body: ArrayBuffer, store: R2Bucket | KVNamespace): Promise<string | null> {
     const storageKey = crypto.randomUUID();
     if ('put' in store && typeof store.put === 'function') { // KVNamespace or R2Bucket
         if('get' in store && typeof store.get === 'function' && !('getRange' in store)) { // KV
              await (store as KVNamespace).put(CACHE_NAMESPACE + storageKey, body);
         } else { // R2
              await (store as R2Bucket).put(storageKey, body);
         }
         return storageKey;
     }
     console.error("Cache store not configured or type unknown for storeBodyInStorage");
     return null;
}

async function generateBodyHash(body: ArrayBuffer): Promise<string> {
     const hashBuffer = await crypto.subtle.digest('SHA-256', body);
     const hashArray = Array.from(new Uint8Array(hashBuffer));
     return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


export async function getCachedResponse(
  db: D1Database,
  cacheKey: string,
  env: Env
): Promise<Response | null> {
  const cachedEntry = await getCachedResponseByKey(db, cacheKey);
  if (!cachedEntry) return null;

  const now = new Date();
  const expiresAt = new Date(cachedEntry.expires_at);

  if (now > expiresAt) {
    // TODO: Implement stale-while-revalidate logic if cacheSetting.stale_while_revalidate_seconds is set
    // For now, just treat as expired
    console.log(`Cache expired for key: ${cacheKey}`);
    await deleteCachedResponse(db, cacheKey); // Clean up expired entry
    return null;
  }

  let body: BodyInit | null = null;
  if (cachedEntry.body_storage_key && env.CACHE_STORE) {
    const storedBody = await getBodyFromStorage(cachedEntry.body_storage_key, env.CACHE_STORE);
    if (storedBody) body = storedBody;
    else { // Body missing from store, invalidate cache
      console.error(`Cached body for key ${cacheKey} (storage key ${cachedEntry.body_storage_key}) not found in store.`);
      await deleteCachedResponse(db, cacheKey);
      return null;
    }
  } else if (cachedEntry.body_inline) {
    // Assuming body_inline is stored as base64 if binary, or plain text
    // This part needs careful handling based on how it's stored.
    // For simplicity, let's assume it's plain text or needs to be decoded if base64.
    // If you store binary as base64: atob(cachedEntry.body_inline) then convert to ArrayBuffer
    body = cachedEntry.body_inline; // Adjust if using base64
  }
  
  const headers = new Headers(JSON.parse(cachedEntry.headers));
  return new Response(body, { status: cachedEntry.status_code, headers });
}

export async function storeResponseInCache(
  db: D1Database,
  requestUrl: string, // Original request URL for matching against CacheSetting
  responseToCache: Response,
  cacheSetting: CacheSetting,
  targetPrefix: string | undefined,
  env: Env
): Promise<void> {
  if (!shouldCacheResponse(responseToCache, new Request(requestUrl))) { // Pass a dummy request for method check
     console.log("Response not eligible for caching based on shouldCacheResponse check.");
     return;
  }

  const cacheKey = await generateCacheKey(requestUrl, targetPrefix);
  const responseClone = responseToCache.clone();
  const bodyArrayBuffer = await responseClone.arrayBuffer();
  const bodyHash = await generateBodyHash(bodyArrayBuffer);

  let bodyStorageKey: string | null = null;
  let bodyInline: string | null = null;

  // Crude check for "large" body, e.g. > 1MB for KV, R2 can handle much larger
  // Cloudflare KV value size limit is 25 MiB. D1 row limit is much smaller.
  const MAX_INLINE_BODY_SIZE = 1024 * 100; // 100KB, adjust as needed

  if (bodyArrayBuffer.byteLength > MAX_INLINE_BODY_SIZE && env.CACHE_STORE) {
     bodyStorageKey = await storeBodyInStorage(bodyArrayBuffer, env.CACHE_STORE);
     if (!bodyStorageKey) {
         console.error("Failed to store large body in cache store. Not caching.");
         return;
     }
  } else if (bodyArrayBuffer.byteLength <= MAX_INLINE_BODY_SIZE) {
     // For simplicity, storing as text. If binary, convert to base64.
     // This assumes text content. For binary, use a base64 conversion.
     try {
         bodyInline = new TextDecoder("utf-8", { fatal: true }).decode(bodyArrayBuffer);
     } catch (e) { // Likely binary data
         const bytes = new Uint8Array(bodyArrayBuffer);
         let binary = '';
         bytes.forEach((byte) => binary += String.fromCharCode(byte));
         bodyInline = btoa(binary); // Store as base64
         // Note: Content-Type header should indicate if it's binary for proper reconstruction
     }
  } else {
     console.warn("Response body too large for inline storage and no CACHE_STORE configured. Not caching.");
     return;
  }

  const expiresAt = new Date(Date.now() + cacheSetting.cache_duration_seconds * 1000).toISOString();
  const headersObject: Record<string, string> = {};
  responseToCache.headers.forEach((value, key) => { headersObject[key] = value; });

  const cachedResponseInput: CachedResponseInput = { // Use CachedResponseInput type
    cache_key: cacheKey,
    target_url_prefix: targetPrefix || null,
    status_code: responseToCache.status,
    headers: JSON.stringify(headersObject),
    body_hash: bodyHash,
    body_storage_key: bodyStorageKey,
    body_inline: bodyInline,
    expires_at: expiresAt,
    // created_at will be set by DB
  };

  await createCachedResponse(db, cachedResponseInput); // No longer need 'as any' if types match
  console.log(`Response for ${requestUrl} stored in cache with key ${cacheKey}`);
}

export function shouldCacheResponse(response: Response, request: Request): boolean {
  if (request.method !== 'GET') return false; // Only cache GET requests typically
  if (response.status < 200 || response.status >= 300) return false; // Only cache 2xx responses

  const cacheControl = response.headers.get('cache-control')?.toLowerCase();
  if (cacheControl && (cacheControl.includes('no-store') || cacheControl.includes('no-cache'))) {
    return false;
  }
  const pragma = response.headers.get('pragma')?.toLowerCase();
  if (pragma && pragma.includes('no-cache')) {
    return false;
  }
  // Could add more checks (e.g., Vary header, cookies)
  return true;
}

export async function findMatchingCacheSetting(
  db: D1Database,
  requestUrl: string, // This should be the original request URL path + query
  targetPrefix?: string
): Promise<CacheSetting | null> {
  const settings = await listActiveCacheSettings(db, targetPrefix);
  for (const setting of settings) {
    try {
      const regex = new RegExp(setting.target_url_pattern);
      if (regex.test(requestUrl)) {
        return setting;
      }
    } catch (e) {
      console.error(`Invalid regex in cache setting '${setting.name}' for pattern '${setting.target_url_pattern}':`, e);
    }
  }
  return null;
}