// src/views/admin/cache.tsx
import { DefaultLayout } from '../layouts/default';
import { UserPayload } from '../../middleware/auth';
import { CacheSetting, ProxiedTarget } from '../../db'; // Import types

interface CachePageProps {
  user?: UserPayload | null;
  cacheSettingsInitial?: CacheSetting[];
  proxiedTargets?: ProxiedTarget[];
  error?: string | null;
  message?: string | null;
  children?: any; // Added to satisfy ComponentWithChildren
}

export const CachePage = ({ user, cacheSettingsInitial = [], proxiedTargets = [], error, message, children }: CachePageProps) => {
  return (
    <DefaultLayout title="Manage Cache" user={user}>
      <h2>Manage Cache Settings & Actions</h2>

      {message && <p style="color: green;">{message}</p>}
      {error && <p style="color: red;">Error: {error}</p>}

      {/* Cache Settings Section */}
      <h3>Cache Configuration Settings</h3>
      <form id="addEditCacheSettingForm" style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc;">
        <input type="hidden" id="cache_setting_id" name="id" />
        <div><label>Name: <input type="text" name="name" required /></label></div>
        <div><label>Target URL Pattern (Regex): <input type="text" name="target_url_pattern" required placeholder="e.g., \\.(jpg|png|css|js)$" /></label></div>
        <div><label>Cache Duration (seconds): <input type="number" name="cache_duration_seconds" required defaultValue="3600" /></label></div>
        <div><label>Stale-While-Revalidate (seconds, optional): <input type="number" name="stale_while_revalidate_seconds" placeholder="60" /></label></div>
        <div><label>Apply to Target Prefix:
           <select name="apply_to_target_prefix_cs">
               <option value="">All Targets (Global)</option>
               {proxiedTargets.map(pt => <option value={pt.target_url_prefix} key={'cs'+pt.id}>{pt.target_url_prefix}</option>)}
           </select></label>
        </div>
        <div><label>Order Priority: <input type="number" name="order_priority" defaultValue="0" /></label></div>
        <div><label>Active: <input type="checkbox" name="is_active_cs" value="1" defaultChecked /></label></div>
        <div><label>Notes: <textarea name="notes_cs"></textarea></label></div>
        <button type="submit">Save Cache Setting</button>
        <button type="button" id="clearCacheSettingForm">Clear</button>
      </form>
      <table id="cacheSettingsTable"><thead><tr><th>Name</th><th>URL Pattern</th><th>Duration</th><th>SWR</th><th>Target</th><th>Priority</th><th>Active</th><th>Actions</th></tr></thead><tbody></tbody></table>

      {/* Cache Management Section */}
      <h3 style="margin-top: 30px;">Cache Management Actions</h3>
      <div style="padding: 10px; border: 1px solid #ccc;">
         <div>
             <button id="clearExpiredCacheBtn">Clear All Expired Cache Entries</button>
             <span id="clearExpiredResult" style="margin-left: 10px;"></span>
         </div>
         <div style="margin-top: 10px;">
             <label htmlFor="specificTargetPrefixClear">Clear Cache for Specific Target Prefix:</label>
             <select id="specificTargetPrefixClear" name="specificTargetPrefixClear" style="margin-right: 5px;">
                 <option value="">Select Target Prefix</option>
                 {proxiedTargets.map(pt => <option value={pt.target_url_prefix} key={'clear_opt_'+pt.id}>{pt.target_url_prefix}</option>)}
             </select>
             <button id="clearSpecificTargetCacheBtn">Clear for Selected Target</button>
             <span id="clearSpecificTargetResult" style="margin-left: 10px;"></span>
         </div>
         <div style="margin-top: 10px;">
             <button id="clearAllCacheBtn" style="color: red;">Clear ENTIRE Cache (All Targets)</button>
             <span id="clearAllResult" style="margin-left: 10px;"></span>
         </div>
      </div>
     <style dangerouslySetInnerHTML={{ __html: `
         label { display: block; margin-bottom: 5px; }
         input[type="text"], input[type="number"], textarea, select { width: 98%; margin-bottom: 8px; padding: 4px; }
         table { width: 100%; border-collapse: collapse; } th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
     `}} />
      <script dangerouslySetInnerHTML={{ __html: `
        const csAuthHeaders = { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'), 'Content-Type': 'application/json' };
        let currentProxiedTargetsCache = ${JSON.stringify(proxiedTargets)};

        // --- Cache Settings ---
        const csTableBody = document.getElementById('cacheSettingsTable')?.getElementsByTagName('tbody')[0];
        const csForm = document.getElementById('addEditCacheSettingForm');
        const csIdField = document.getElementById('cache_setting_id');
        const csClearBtn = document.getElementById('clearCacheSettingForm');
        const csTargetSelect = document.querySelector('select[name="apply_to_target_prefix_cs"]');
        const csSpecificTargetClearSelect = document.getElementById('specificTargetPrefixClear');


        function displayCacheError(formIdOrElem, errorMessage) {
             const targetElem = typeof formIdOrElem === 'string' ? document.getElementById(formIdOrElem) : formIdOrElem;
             let errorP = targetElem.nextElementSibling;
             if (!errorP || errorP.tagName !== 'P' || errorP.style.color !== 'red') {
                 errorP = document.createElement('p');
                 errorP.style.color = 'red';
                 targetElem.insertAdjacentElement('afterend', errorP);
             }
             errorP.textContent = 'Error: ' + errorMessage;
        }
        function displayCacheMessage(formIdOrElem, msg) {
             const targetElem = typeof formIdOrElem === 'string' ? document.getElementById(formIdOrElem) : formIdOrElem;
             let msgP = targetElem.nextElementSibling;
              if (!msgP || msgP.tagName !== 'P' || msgP.style.color !== 'green') {
                 msgP = document.createElement('p');
                 msgP.style.color = 'green';
                 targetElem.insertAdjacentElement('afterend', msgP);
             }
             msgP.textContent = msg;
        }
        
        function populateCsTargetDropdowns(targets) {
             if (csTargetSelect) {
                 const currentCsValue = csTargetSelect.value;
                 csTargetSelect.innerHTML = '<option value="">All Targets (Global)</option>';
                 targets.forEach(pt => csTargetSelect.add(new Option(pt.target_url_prefix, pt.target_url_prefix)));
                 csTargetSelect.value = currentCsValue;
             }
             if (csSpecificTargetClearSelect) {
                 const currentClearValue = csSpecificTargetClearSelect.value;
                 csSpecificTargetClearSelect.innerHTML = '<option value="">Select Target Prefix</option>';
                 targets.forEach(pt => csSpecificTargetClearSelect.add(new Option(pt.target_url_prefix, pt.target_url_prefix)));
                 csSpecificTargetClearSelect.value = currentClearValue;
             }
        }

        async function fetchCacheSettings() {
          try {
            const response = await fetch('/admin/api/cache-settings', { headers: csAuthHeaders });
            if (!response.ok) throw new Error('Failed to fetch cache settings');
            const settings = await response.json();
            renderCacheSettings(settings);
          } catch (err) { displayCacheError('addEditCacheSettingForm', err.message); }
        }

        function renderCacheSettings(settings) {
          if (!csTableBody) return;
          csTableBody.innerHTML = '';
          settings.forEach(s => {
            const r = csTableBody.insertRow();
            r.insertCell().textContent = s.name;
            r.insertCell().textContent = s.target_url_pattern;
            r.insertCell().textContent = s.cache_duration_seconds;
            r.insertCell().textContent = s.stale_while_revalidate_seconds || '-';
            r.insertCell().textContent = s.apply_to_target_prefix || 'Global';
            r.insertCell().textContent = s.order_priority;
            r.insertCell().textContent = s.is_active ? 'Yes' : 'No';
            r.insertCell().innerHTML = \\\`<button onclick="editCacheSetting('\\\${s.id}')">Edit</button> <button onclick="deleteCacheSetting('\\\${s.id}')">Delete</button>\\\`;
          });
        }
        
        csClearBtn?.addEventListener('click', () => { csForm.reset(); csIdField.value = ''; });

        csForm?.addEventListener('submit', async function(e) {
          e.preventDefault();
          const formData = new FormData(this);
          const id = formData.get('id');
          const data = {
             name: formData.get('name'), target_url_pattern: formData.get('target_url_pattern'),
             cache_duration_seconds: parseInt(formData.get('cache_duration_seconds'),10),
             stale_while_revalidate_seconds: formData.get('stale_while_revalidate_seconds') ? parseInt(formData.get('stale_while_revalidate_seconds'),10) : null,
             apply_to_target_prefix: formData.get('apply_to_target_prefix_cs') || null,
             order_priority: parseInt(formData.get('order_priority'),10) || 0,
             is_active: formData.has('is_active_cs') ? 1 : 0, notes: formData.get('notes_cs') || null,
          };
          if (isNaN(data.cache_duration_seconds)) { displayCacheError('addEditCacheSettingForm', 'Cache duration must be a number.'); return; }

          const method = id ? 'PUT' : 'POST';
          const url = id ? \\\`/admin/api/cache-settings/\\\${id}\\\` : '/admin/api/cache-settings';
          try {
            const res = await fetch(url, { method, headers: csAuthHeaders, body: JSON.stringify(data) });
            if (!res.ok) { const ed = await res.json(); throw new Error(ed.error || 'Save failed'); }
            csForm.reset(); csIdField.value = ''; fetchCacheSettings(); displayCacheMessage('addEditCacheSettingForm', 'Cache setting saved.');
          } catch (err) { displayCacheError('addEditCacheSettingForm', err.message); }
        });

        window.editCacheSetting = async (id) => {
          try {
            const res = await fetch(\\\`/admin/api/cache-settings/\\\${id}\\\`, { headers: csAuthHeaders });
            if (!res.ok) throw new Error('Fetch failed');
            const setting = await res.json();
            csIdField.value = setting.id;
            for(const key in setting) {
              const field = csForm.elements[key];
              if (field) {
                 if(field.type === 'checkbox') field.checked = !!setting[key];
                 else field.value = setting[key] ?? '';
              } else if (key === 'apply_to_target_prefix') {
                 csForm.elements['apply_to_target_prefix_cs'].value = setting[key] || '';
              } else if (key === 'is_active') {
                 csForm.elements['is_active_cs'].checked = !!setting[key];
              } else if (key === 'notes') {
                 csForm.elements['notes_cs'].value = setting[key] || '';
              }
            }
          } catch (err) { displayCacheError('addEditCacheSettingForm', err.message); }
        };
        window.deleteCacheSetting = async (id) => {
          if (!confirm('Delete cache setting?')) return;
          try {
            const res = await fetch(\\\`/admin/api/cache-settings/\\\${id}\\\`, { method: 'DELETE', headers: csAuthHeaders });
            if (!res.ok) { const ed = await res.json(); throw new Error(ed.error || 'Delete failed'); }
            fetchCacheSettings(); displayCacheMessage('addEditCacheSettingForm', 'Cache setting deleted.');
          } catch (err) { displayCacheError('addEditCacheSettingForm', err.message); }
        };

        // --- Cache Management Actions ---
        document.getElementById('clearExpiredCacheBtn')?.addEventListener('click', async () => {
             const resultSpan = document.getElementById('clearExpiredResult');
             try {
                 const res = await fetch('/admin/api/cache/expired', { method: 'DELETE', headers: csAuthHeaders });
                 const data = await res.json();
                 if (!res.ok) throw new Error(data.error || 'Failed to clear expired cache');
                 resultSpan.textContent = \\\`Success: \\\${data.deletedCount} expired entries cleared.\\\`;
                 resultSpan.style.color = 'green';
             } catch (err) { resultSpan.textContent = 'Error: ' + err.message; resultSpan.style.color = 'red';}
        });
        document.getElementById('clearSpecificTargetCacheBtn')?.addEventListener('click', async () => {
             const resultSpan = document.getElementById('clearSpecificTargetResult');
             const prefix = csSpecificTargetClearSelect.value;
             if (!prefix) { resultSpan.textContent = 'Please select a target prefix.'; resultSpan.style.color = 'orange'; return; }
             if (!confirm(\\\`Clear ALL cache for target "\\\${prefix}"?\\\`)) return;
             try {
                 const res = await fetch(\\\`/admin/api/cache/target/\\\${encodeURIComponent(prefix)}\\\`, { method: 'DELETE', headers: csAuthHeaders });
                 const data = await res.json();
                 if (!res.ok) throw new Error(data.error || 'Failed to clear target cache');
                 resultSpan.textContent = \\\`Success: \\\${data.deletedCount} entries cleared for \\\${prefix}.\\\`;
                 resultSpan.style.color = 'green';
             } catch (err) { resultSpan.textContent = 'Error: ' + err.message; resultSpan.style.color = 'red';}
        });
        document.getElementById('clearAllCacheBtn')?.addEventListener('click', async () => {
             const resultSpan = document.getElementById('clearAllResult');
             if (!confirm('Are you ABSOLUTELY SURE you want to clear the ENTIRE cache for ALL targets? This cannot be undone.')) return;
             try {
                 const res = await fetch('/admin/api/cache/all', { method: 'DELETE', headers: csAuthHeaders });
                 const data = await res.json();
                 if (!res.ok) throw new Error(data.error || 'Failed to clear all cache');
                 resultSpan.textContent = \\\`Success: \\\${data.deletedCount} total entries cleared.\\\`;
                 resultSpan.style.color = 'green';
             } catch (err) { resultSpan.textContent = 'Error: ' + err.message; resultSpan.style.color = 'red';}
        });
        
        async function fetchProxiedTargetsForCacheDropdown() {
             try {
                 const response = await fetch('/admin/api/targets', { headers: csAuthHeaders });
                 if (!response.ok) throw new Error('Failed to fetch proxied targets for cache page');
                 currentProxiedTargetsCache = await response.json();
                 populateCsTargetDropdowns(currentProxiedTargetsCache);
             } catch (err) {
                 console.error("Error fetching proxied targets for cache dropdown:", err);
             }
        }

        document.addEventListener('DOMContentLoaded', () => {
          fetchCacheSettings();
          fetchProxiedTargetsForCacheDropdown();
        });
      `}} />
    </DefaultLayout>
  );
}