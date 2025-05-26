// src/services/asyncProcessor.ts
import { D1Database, AsyncPolicy, listActiveAsyncPolicies } from '../db';

export interface AsyncActionResult {
  action: 'proxy' | 'direct';
  policyName?: string; // Name of the policy that matched
  matchedPattern?: string; // The pattern that matched
}

/**
 * Determines the asynchronous action (proxy or direct) for a given request URL
 * based on active policies.
 * @param db D1Database instance.
 * @param originalRequestUrl The full original URL of the incoming request.
 * @param proxiedTargetPrefix Optional. The target_url_prefix of the ProxiedTarget being used.
 *                            This helps filter policies to only those applicable globally or to this specific target.
 * @returns An object indicating the action to take and the name of the matching policy, if any.
 */
export async function getAsyncActionForRequest(
  db: D1Database,
  originalRequestUrl: string,
  proxiedTargetPrefix?: string
): Promise<AsyncActionResult> {
  try {
    const applicablePolicies = await listActiveAsyncPolicies(db, proxiedTargetPrefix);

    for (const policy of applicablePolicies) {
      try {
        const regex = new RegExp(policy.target_url_pattern);
        if (regex.test(originalRequestUrl)) {
          console.log(`Async policy matched: '${policy.name}' for URL '${originalRequestUrl}' with pattern '${policy.target_url_pattern}'`);
          return {
            action: policy.action,
            policyName: policy.name,
            matchedPattern: policy.target_url_pattern
          };
        }
      } catch (e) {
        console.error(`Invalid regex in policy '${policy.name}' (ID: ${policy.id}): ${policy.target_url_pattern}`, e);
        // Skip this policy if regex is invalid, or handle as an error depending on desired strictness
      }
    }
  } catch (error) {
     console.error("Error fetching or processing async policies:", error);
     // Fallback to default action in case of DB error or other issues
     return { action: 'proxy', policyName: 'ErrorFallbackDefault' };
  }
  
  // Default action if no policies match
  return { action: 'proxy', policyName: 'DefaultProxyAction' };
}