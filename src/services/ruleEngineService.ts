// src/services/ruleEngineService.ts
import { D1Database, HeaderRule, ResponseRule, listActiveHeaderRules, listActiveResponseRules } from '../db';

// Helper for status code matching (e.g., "200", "4xx", "*")
function matchStatusCode(ruleCode: string | null | undefined, actualCode: number): boolean {
  if (!ruleCode || ruleCode === '*') return true;
  if (ruleCode.endsWith('xx')) { // e.g., 4xx
    const prefix = ruleCode.substring(0, 1);
    return Math.floor(actualCode / 100).toString() === prefix;
  }
  return ruleCode === actualCode.toString();
}

// Helper for content type matching (supports regex)
function matchContentType(ruleType: string | null | undefined, actualType: string | null): boolean {
  if (!ruleType || ruleType === '*') return true;
  if (!actualType) return false;
  try {
    return new RegExp(ruleType, 'i').test(actualType);
  } catch (e) {
    console.error("Invalid regex for content type match:", ruleType, e);
    return false; // Treat invalid regex as non-match
  }
}


export async function applyRequestHeaderRules(
  db: D1Database,
  originalHeaders: Headers,
  targetPrefix?: string
): Promise<Headers> {
  const rules = await listActiveHeaderRules(db, targetPrefix, 'request');
  if (!rules.length) return originalHeaders;

  const newHeaders = new Headers(originalHeaders); // Work on a copy

  for (const rule of rules) {
    const headerName = rule.header_name.toLowerCase(); // Header names are case-insensitive
    switch (rule.action as any) { // Temporarily use 'as any' -  FIX TYPE DEFINITION in src/db/index.ts
      case 'add':
        if (rule.replacement_value) {
          newHeaders.append(headerName, rule.replacement_value);
        }
        break;
      case 'set':
        if (rule.replacement_value) {
          newHeaders.set(headerName, rule.replacement_value);
        }
        break;
      case 'remove':
        newHeaders.delete(headerName);
        break;
      case 'replace':
        if (newHeaders.has(headerName) && rule.value_pattern && rule.replacement_value !== null) {
          const currentValue = newHeaders.get(headerName);
          if (currentValue) {
            try {
              const regex = new RegExp(rule.value_pattern, 'g');
              newHeaders.set(headerName, currentValue.replace(regex, rule.replacement_value || ''));
            } catch (e) {
              console.error(`Invalid regex in header rule '${rule.name}' for pattern '${rule.value_pattern}':`, e);
            }
          }
        }
        break;
    }
  }
  return newHeaders;
}

export async function applyResponseHeaderRules(
  db: D1Database,
  originalHeaders: Headers,
  targetPrefix?: string
): Promise<Headers> {
  const rules = await listActiveHeaderRules(db, targetPrefix, 'response');
  if (!rules.length) return originalHeaders;
  
  const newHeaders = new Headers(originalHeaders); // Work on a copy

  for (const rule of rules) {
    const headerName = rule.header_name.toLowerCase();
    switch (rule.action as any) { // Temporarily use 'as any' -  FIX TYPE DEFINITION in src/db/index.ts
      case 'add':
        if (rule.replacement_value) newHeaders.append(headerName, rule.replacement_value);
        break;
      case 'set':
        if (rule.replacement_value) newHeaders.set(headerName, rule.replacement_value);
        break;
      case 'remove':
        newHeaders.delete(headerName);
        break;
      case 'replace':
        if (newHeaders.has(headerName) && rule.value_pattern && rule.replacement_value !== null) {
          const currentValue = newHeaders.get(headerName);
          if (currentValue) {
             try {
                 const regex = new RegExp(rule.value_pattern, 'g');
                 newHeaders.set(headerName, currentValue.replace(regex, rule.replacement_value || ''));
             } catch (e) {
                 console.error(`Invalid regex in header rule '${rule.name}' for pattern '${rule.value_pattern}':`, e);
             }
          }
        }
        break;
    }
  }
  return newHeaders;
}

export async function applyResponseRules(
  db: D1Database,
  originalResponse: Response,
  targetPrefix?: string
): Promise<Response> {
  const rules = await listActiveResponseRules(db, targetPrefix);
  if (!rules.length) return originalResponse;

  let currentResponse = originalResponse.clone(); // Clone to modify headers/body

  for (const rule of rules) {
    const actualStatusCode = currentResponse.status;
    const actualContentType = currentResponse.headers.get('content-type');

    if (!matchStatusCode(rule.match_status_code !== null && rule.match_status_code !== undefined ? String(rule.match_status_code) : null, actualStatusCode)) continue;
    if (!matchContentType(rule.match_content_type, actualContentType)) continue;

    // If conditions met, apply body action
    if (rule.body_action && rule.body_pattern && rule.body_replacement !== null) {
      let bodyText: string;
      try {
         bodyText = await currentResponse.text(); // Read body once
      } catch (e) {
         console.error("Error reading response body for rule processing:", e);
         continue; // Cannot process body if unreadable
      }
      
      let newBodyText = bodyText;

      switch (rule.body_action as any) { // Temporarily use 'as any' - FIX TYPE DEFINITION in src/db/index.ts
        case 'replace_text':
          try {
            const regex = new RegExp(rule.body_pattern, 'g');
            newBodyText = bodyText.replace(regex, rule.body_replacement || '');
          } catch (e) {
            console.error(`Invalid regex in response rule '${rule.name}' for pattern '${rule.body_pattern}':`, e);
            continue; // Skip rule if regex is bad
          }
          break;
        case 'inject_script': // Assuming HTML content type for script injection
          if (actualContentType && actualContentType.toLowerCase().includes('text/html')) {
            const scriptTag = rule.body_replacement?.startsWith('http') ? 
                              `<script src="${rule.body_replacement}"></script>` : 
                              `<script>${rule.body_replacement}</script>`;
            if (bodyText.includes('</body>')) {
              newBodyText = bodyText.replace('</body>', `${scriptTag}</body>`);
            } else {
              newBodyText = bodyText + scriptTag; // Append if no body tag found
            }
          }
          break;
        case 'replace_json_value':
          // TODO: Implement JSONPath modification. This is complex.
          // For now, log a warning or skip.
          console.warn(`Response rule action 'replace_json_value' for rule '${rule.name}' is not yet fully implemented.`);
          continue; // Skip this action for now
      }
      
      if (newBodyText !== bodyText) {
         // Create a new response with the modified body
         // Ensure headers from currentResponse (which might have been modified by header rules) are used.
         const newHeaders = new Headers(currentResponse.headers);
         newHeaders.delete('content-length'); // Recalculate
         currentResponse = new Response(newBodyText, {
             status: currentResponse.status,
             statusText: currentResponse.statusText,
             headers: newHeaders
         });
      }
    }
  }
  return currentResponse;
}