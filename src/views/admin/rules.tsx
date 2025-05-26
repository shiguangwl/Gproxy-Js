import { jsxRenderer } from 'hono/jsx-renderer'; // Keep jsxRenderer if used internally, or remove if not
import { DefaultLayout } from '../layouts/default';
import { UserPayload } from '../../middleware/auth';
import { HeaderRule, ResponseRule, ProxiedTarget } from '../../db'; // Import types

interface RulesPageProps {
  user?: UserPayload | null;
  headerRulesInitial?: HeaderRule[];
  responseRulesInitial?: ResponseRule[];
  proxiedTargets?: ProxiedTarget[]; // 确保这个类型是正确的，并且在使用时已定义
  error?: string | null;
  message?: string | null;
}

// 直接使用 RulesPageProps 类型化 props, 并添加 children?: any 以尝试满足 ComponentWithChildren
const RulesPage = ({ user, headerRulesInitial = [], responseRulesInitial = [], proxiedTargets = [], error, message, children }: RulesPageProps & { children?: any }) => {
  const styleString = `
        .tab-content { display: none; }
        .tabs button { background-color: #f1f1f1; border: 1px solid #ccc; padding: 10px; cursor: pointer; }
        .tabs button.active { background-color: #ddd; }
        label { display: block; margin-bottom: 5px; }
        input[type="text"], input[type="number"], textarea, select { width: 98%; margin-bottom: 8px; padding: 4px; }
        table { width: 100%; border-collapse: collapse; } th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    `;
  const scriptString = `
       // Tab switching logic
       function openTab(evt, tabName) {
         var i, tabcontent, tablinks;
         tabcontent = document.getElementsByClassName("tab-content");
         for (i = 0; i < tabcontent.length; i++) {
           tabcontent[i].style.display = "none";
         }
         tablinks = document.getElementsByClassName("tab-button");
         for (i = 0; i < tablinks.length; i++) {
           tablinks[i].className = tablinks[i].className.replace(" active", "");
         }
         document.getElementById(tabName).style.display = "block";
         evt.currentTarget.className += " active";
       }

       // Shared display functions
       function displayRuleError(formId, errorMessage) {
            let errorP = document.querySelector('#' + formId + ' ~ p[style="color: red;"]');
            if (!errorP) {
                errorP = document.createElement('p');
                errorP.style.color = 'red';
                const formElement = document.getElementById(formId);
                if (formElement) {
                    formElement.insertAdjacentElement('afterend', errorP);
                }
            }
            if (errorP) errorP.textContent = 'Error: ' + errorMessage;
       }
       function displayRuleMessage(formId, msg) {
            let msgP = document.querySelector('#' + formId + ' ~ p[style="color: green;"]');
             if (!msgP) {
                msgP = document.createElement('p');
                msgP.style.color = 'green';
                const formElement = document.getElementById(formId);
                if (formElement) {
                    formElement.insertAdjacentElement('afterend', msgP);
                }
            }
            if (msgP) msgP.textContent = msg;
       }
       
       const authHeaders = { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'), 'Content-Type': 'application/json' };
       let currentProxiedTargetsRules = ${JSON.stringify(proxiedTargets)};

       // --- Header Rules ---
       const hrTableBody = document.getElementById('headerRulesTable')?.getElementsByTagName('tbody')[0];
       const hrForm = document.getElementById('addEditHeaderRuleForm');
       const hrIdField = document.getElementById('header_rule_id');
       const hrClearBtn = document.getElementById('clearHeaderRuleForm');
       const hrTargetSelect = document.querySelector('select[name="apply_to_target_prefix_hr"]');


       function populateHrTargetDropdown(targets) {
            if (!hrTargetSelect) return;
            const currentValue = hrTargetSelect.value;
            hrTargetSelect.innerHTML = '<option value="">All Targets (Global)</option>';
            targets.forEach(pt => {
                const option = document.createElement('option');
                option.value = pt.target_url_prefix;
                option.textContent = pt.target_url_prefix;
                // option.key = 'hr_opt_' + pt.id; // .key is a React concept, not for direct DOM manipulation
                hrTargetSelect.appendChild(option);
            });
            hrTargetSelect.value = currentValue;
       }


       async function fetchHeaderRules() {
         try {
           const response = await fetch('/admin/api/header-rules', { headers: authHeaders });
           if (!response.ok) {
             const errData = await response.json().catch(() => ({error: 'Failed to fetch header rules and parse error'}));
             throw new Error(errData.error || 'Failed to fetch header rules');
           }
           const rules = await response.json();
           renderHeaderRules(rules);
         } catch (err) { displayRuleError('addEditHeaderRuleForm', err.message); }
       }

       function renderHeaderRules(rules) {
         if (!hrTableBody) return;
         hrTableBody.innerHTML = '';
         rules.forEach(rule => {
           const r = hrTableBody.insertRow();
           r.insertCell().textContent = rule.name;
           r.insertCell().textContent = rule.rule_phase;
           r.insertCell().textContent = rule.header_name;
           r.insertCell().textContent = rule.action;
           r.insertCell().textContent = rule.value_pattern || '-';
           r.insertCell().textContent = rule.replacement_value || '-';
           r.insertCell().textContent = rule.apply_to_target_prefix || 'Global';
           r.insertCell().textContent = String(rule.order_priority);
           r.insertCell().textContent = rule.is_active ? 'Yes' : 'No';
           r.insertCell().innerHTML = '<button onclick="editHeaderRule(\`' + rule.id + '\`)">Edit</button> <button onclick="deleteHeaderRule(\`' + rule.id + '\`)">Delete</button>';
         });
       }
       
       if(hrClearBtn && hrForm) hrClearBtn.addEventListener('click', () => { hrForm.reset(); if(hrIdField) hrIdField.value = ''; });

       if(hrForm) hrForm.addEventListener('submit', async function(e) {
         e.preventDefault();
         const formData = new FormData(this);
         const id = formData.get('id');
         const data = {
            name: formData.get('name'), rule_phase: formData.get('rule_phase'), header_name: formData.get('header_name'),
            action: formData.get('action'), value_pattern: formData.get('value_pattern') || null,
            replacement_value: formData.get('replacement_value') || null,
            apply_to_target_prefix: formData.get('apply_to_target_prefix_hr') || null,
            order_priority: parseInt(formData.get('order_priority'),10) || 0,
            is_active: formData.has('is_active_hr') ? 1 : 0, notes: formData.get('notes_hr') || null,
         };
         const method = id ? 'PUT' : 'POST';
         const url = id ? '/admin/api/header-rules/' + id : '/admin/api/header-rules';
         try {
           const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(data) });
           if (!res.ok) { const ed = await res.json(); throw new Error(ed.error || 'Save failed'); }
           if(hrForm && hrIdField) { hrForm.reset(); hrIdField.value = ''; }
           fetchHeaderRules(); displayRuleMessage('addEditHeaderRuleForm', 'Header rule saved.');
         } catch (err) { displayRuleError('addEditHeaderRuleForm', err.message); }
       });

       window.editHeaderRule = async (id) => {
         try {
           const res = await fetch('/admin/api/header-rules/' + id, { headers: authHeaders });
           if (!res.ok) throw new Error('Fetch failed for header rule ' + id);
           const rule = await res.json();
           if(hrIdField) hrIdField.value = rule.id;
           if(hrForm) {
             Object.keys(rule).forEach(key => {
               const field = hrForm.elements[key];
               if(field) {
                  if(field.type === 'checkbox') field.checked = !!rule[key];
                  else if(key === 'apply_to_target_prefix_hr' && hrForm.elements['apply_to_target_prefix_hr']) hrForm.elements['apply_to_target_prefix_hr'].value = rule['apply_to_target_prefix'] || '';
                  else if(key === 'is_active_hr' && hrForm.elements['is_active_hr']) hrForm.elements['is_active_hr'].checked = !!rule['is_active'];
                  else if(key === 'notes_hr' && hrForm.elements['notes_hr']) hrForm.elements['notes_hr'].value = rule['notes'] || '';
                  else field.value = rule[key] ?? '';
               }
             });
           }
         } catch (err) { displayRuleError('addEditHeaderRuleForm', err.message); }
       };
       window.deleteHeaderRule = async (id) => {
         if (!confirm('Delete header rule?')) return;
         try {
           const res = await fetch('/admin/api/header-rules/' + id, { method: 'DELETE', headers: authHeaders });
           if (!res.ok) { const ed = await res.json(); throw new Error(ed.error || 'Delete failed'); }
           fetchHeaderRules(); displayRuleMessage('addEditHeaderRuleForm', 'Header rule deleted.');
         } catch (err) { displayRuleError('addEditHeaderRuleForm', err.message); }
       };

       // --- Response Rules ---
       const rrTableBody = document.getElementById('responseRulesTable')?.getElementsByTagName('tbody')[0];
       const rrForm = document.getElementById('addEditResponseRuleForm');
       const rrIdField = document.getElementById('response_rule_id');
       const rrClearBtn = document.getElementById('clearResponseRuleForm');
       const rrTargetSelect = document.querySelector('select[name="apply_to_target_prefix_rr"]');

       function populateRrTargetDropdown(targets) {
            if (!rrTargetSelect) return;
            const currentValue = rrTargetSelect.value;
            rrTargetSelect.innerHTML = '<option value="">All Targets (Global)</option>';
            targets.forEach(pt => {
                const option = document.createElement('option');
                option.value = pt.target_url_prefix;
                option.textContent = pt.target_url_prefix;
                // option.key = 'rr_opt_' + pt.id; // .key is a React concept
                rrTargetSelect.appendChild(option);
            });
            rrTargetSelect.value = currentValue;
       }

       async function fetchResponseRules() {
         try {
           const response = await fetch('/admin/api/response-rules', { headers: authHeaders });
            if (!response.ok) {
             const errData = await response.json().catch(() => ({error: 'Failed to fetch response rules and parse error'}));
             throw new Error(errData.error || 'Failed to fetch response rules');
           }
           const rules = await response.json();
           renderResponseRules(rules);
         } catch (err) { displayRuleError('addEditResponseRuleForm', err.message); }
       }

       function renderResponseRules(rules) {
         if (!rrTableBody) return;
         rrTableBody.innerHTML = '';
         rules.forEach(rule => {
           const r = rrTableBody.insertRow();
           r.insertCell().textContent = rule.name;
           r.insertCell().textContent = rule.match_status_code || '*';
           r.insertCell().textContent = rule.match_content_type || '*';
           r.insertCell().textContent = rule.body_action || '-';
           r.insertCell().textContent = rule.body_pattern || '-';
           r.insertCell().textContent = rule.apply_to_target_prefix || 'Global';
           r.insertCell().textContent = String(rule.order_priority);
           r.insertCell().textContent = rule.is_active ? 'Yes' : 'No';
           r.insertCell().innerHTML = '<button onclick="editResponseRule(\`' + rule.id + '\`)">Edit</button> <button onclick="deleteResponseRule(\`' + rule.id + '\`)">Delete</button>';
         });
       }
       
       if(rrClearBtn && rrForm) rrClearBtn.addEventListener('click', () => { rrForm.reset(); if(rrIdField) rrIdField.value = ''; });

       if(rrForm) rrForm.addEventListener('submit', async function(e) {
         e.preventDefault();
         const formData = new FormData(this);
         const id = formData.get('id');
         const data = {
            name: formData.get('name'), match_status_code: formData.get('match_status_code') || null,
            match_content_type: formData.get('match_content_type') || null, body_action: formData.get('body_action') || null,
            body_pattern: formData.get('body_pattern') || null, body_replacement: formData.get('body_replacement') || null,
            apply_to_target_prefix: formData.get('apply_to_target_prefix_rr') || null,
            order_priority: parseInt(formData.get('order_priority'),10) || 0,
            is_active: formData.has('is_active_rr') ? 1 : 0, notes: formData.get('notes_rr') || null,
         };
         const method = id ? 'PUT' : 'POST';
         const url = id ? '/admin/api/response-rules/' + id : '/admin/api/response-rules';
         try {
           const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(data) });
           if (!res.ok) { const ed = await res.json(); throw new Error(ed.error || 'Save failed'); }
            if(rrForm && rrIdField) { rrForm.reset(); rrIdField.value = ''; }
           fetchResponseRules(); displayRuleMessage('addEditResponseRuleForm', 'Response rule saved.');
         } catch (err) { displayRuleError('addEditResponseRuleForm', err.message); }
       });

       window.editResponseRule = async (id) => {
         try {
           const res = await fetch('/admin/api/response-rules/' + id, { headers: authHeaders });
           if (!res.ok) throw new Error('Fetch failed for response rule ' + id);
           const rule = await res.json();
           if(rrIdField) rrIdField.value = rule.id;
           if(rrForm) {
             Object.keys(rule).forEach(key => {
               const field = rrForm.elements[key];
               if(field) {
                  if(field.type === 'checkbox') field.checked = !!rule[key];
                  else if(key === 'apply_to_target_prefix_rr' && rrForm.elements['apply_to_target_prefix_rr']) rrForm.elements['apply_to_target_prefix_rr'].value = rule['apply_to_target_prefix'] || '';
                  else if(key === 'is_active_rr' && rrForm.elements['is_active_rr']) rrForm.elements['is_active_rr'].checked = !!rule['is_active'];
                  else if(key === 'notes_rr' && rrForm.elements['notes_rr']) rrForm.elements['notes_rr'].value = rule['notes'] || '';
                  else field.value = rule[key] ?? '';
               }
             });
           }
         } catch (err) { displayRuleError('addEditResponseRuleForm', err.message); }
       };
       window.deleteResponseRule = async (id) => {
         if (!confirm('Delete response rule?')) return;
         try {
           const res = await fetch('/admin/api/response-rules/' + id, { method: 'DELETE', headers: authHeaders });
           if (!res.ok) { const ed = await res.json(); throw new Error(ed.error || 'Delete failed'); }
           fetchResponseRules(); displayRuleMessage('addEditResponseRuleForm', 'Response rule deleted.');
         } catch (err) { displayRuleError('addEditResponseRuleForm', err.message); }
       };
       
       async function fetchProxiedTargetsForRulesDropdown() {
            try {
                const response = await fetch('/admin/api/targets', { headers: authHeaders });
                if (!response.ok) throw new Error('Failed to fetch proxied targets for rules');
                currentProxiedTargetsRules = await response.json();
                populateHrTargetDropdown(currentProxiedTargetsRules);
                populateRrTargetDropdown(currentProxiedTargetsRules);
            } catch (err) {
                console.error("Error fetching proxied targets for rules dropdown:", err);
                // Optionally display this error to the user in a non-disruptive way
            }
       }

       document.addEventListener('DOMContentLoaded', () => {
         fetchHeaderRules();
         fetchResponseRules();
         fetchProxiedTargetsForRulesDropdown();
         // Activate the first tab by default
         const firstTabButton = document.querySelector('.tab-button');
         if (firstTabButton) {
            firstTabButton.click();
         }
       });
    `;

  return (
    <DefaultLayout title="Manage Rules" user={user}>
      <h2>Manage Rules</h2>

      {message && <p style="color: green;">{message}</p>}
      {error && <p style="color: red;">Error: {error}</p>}

      {/* Tabs or Sections for Header and Response Rules */}
      <div class="tabs" style="margin-bottom:20px;">
        <button class="tab-button active" onclick="openTab(event, 'HeaderRules')">Header Rules</button>
        <button class="tab-button" onclick="openTab(event, 'ResponseRules')">Response Rules</button>
      </div>

      {/* Header Rules Section */}
      <div id="HeaderRules" class="tab-content" style="display:block;">
        <h3>Header Rules</h3>
        <form id="addEditHeaderRuleForm" style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc;">
          <input type="hidden" id="header_rule_id" name="id" />
          <div><label>Name: <input type="text" name="name" required /></label></div>
          <div><label>Phase:
            <select name="rule_phase">
              <option value="request">Request</option>
              <option value="response">Response</option>
            </select></label>
          </div>
          <div><label>Header Name: <input type="text" name="header_name" required /></label></div>
          <div><label>Action:
            <select name="action">
              <option value="add">Add</option>
              <option value="set">Set</option>
              <option value="remove">Remove</option>
              <option value="replace">Replace</option>
            </select></label>
          </div>
          <div><label>Value Pattern (Regex, for 'replace'): <input type="text" name="value_pattern" /></label></div>
          <div><label>Replacement Value (for 'add', 'set', 'replace'): <input type="text" name="replacement_value" /></label></div>
          <div><label>Apply to Target Prefix:
            <select name="apply_to_target_prefix_hr">
              <option value="">All Targets (Global)</option>
              {(proxiedTargets || []).map((pt: ProxiedTarget) => <option value={pt.target_url_prefix} key={'hr' + pt.id}>{pt.target_url_prefix}</option>)}
            </select></label>
          </div>
          <div><label>Order Priority: <input type="number" name="order_priority" defaultValue="0" /></label></div>
          <div><label>Active: <input type="checkbox" name="is_active_hr" value="1" defaultChecked /></label></div>
          <div><label>Notes: <textarea name="notes_hr"></textarea></label></div>
          <button type="submit">Save Header Rule</button>
          <button type="button" id="clearHeaderRuleForm">Clear</button>
        </form>
        <table id="headerRulesTable" border={1}><thead><tr><th>Name</th><th>Phase</th><th>Header</th><th>Action</th><th>Pattern</th><th>Replacement</th><th>Target</th><th>Priority</th><th>Active</th><th>Actions</th></tr></thead><tbody></tbody></table>
      </div>

      {/* Response Rules Section */}
      <div id="ResponseRules" class="tab-content" style="display:none;">
        <h3>Response Rules</h3>
        <form id="addEditResponseRuleForm" style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc;">
          <input type="hidden" id="response_rule_id" name="id" />
          <div><label>Name: <input type="text" name="name" required /></label></div>
          <div><label>Match Status Code (e.g., 200, 4xx, *): <input type="text" name="match_status_code" placeholder="200" /></label></div>
          <div><label>Match Content-Type (Regex, e.g., text/html): <input type="text" name="match_content_type" placeholder="text/html" /></label></div>
          <div><label>Body Action:
            <select name="body_action">
              <option value="">None</option>
              <option value="replace_text">Replace Text</option>
              <option value="replace_json_value">Replace JSON Value (Path.to.key)</option>
              <option value="inject_script">Inject Script (End of {'<'}body{'>'})</option>
            </select></label>
          </div>
          <div><label>Body Pattern (Regex for 'replace_text', JSONPath for 'replace_json_value'): <input type="text" name="body_pattern" /></label></div>
          <div><label>Body Replacement / Script URL: <textarea name="body_replacement"></textarea></label></div>
          <div><label>Apply to Target Prefix:
            <select name="apply_to_target_prefix_rr">
              <option value="">All Targets (Global)</option>
              {(proxiedTargets || []).map((pt: ProxiedTarget) => <option value={pt.target_url_prefix} key={'rr' + pt.id}>{pt.target_url_prefix}</option>)}
            </select></label>
          </div>
          <div><label>Order Priority: <input type="number" name="order_priority" defaultValue="0" /></label></div>
          <div><label>Active: <input type="checkbox" name="is_active_rr" value="1" defaultChecked /></label></div>
          <div><label>Notes: <textarea name="notes_rr"></textarea></label></div>
          <button type="submit">Save Response Rule</button>
          <button type="button" id="clearResponseRuleForm">Clear</button>
        </form>
        <table id="responseRulesTable" border={1}><thead><tr><th>Name</th><th>Status</th><th>Content-Type</th><th>Body Action</th><th>Pattern</th><th>Target</th><th>Priority</th><th>Active</th><th>Actions</th></tr></thead><tbody></tbody></table>
      </div>
      <style dangerouslySetInnerHTML={{ __html: styleString }} />
      <script dangerouslySetInnerHTML={{ __html: scriptString }} />
    </DefaultLayout>
  );
};

// Export the raw component for flexibility
export { RulesPage };

// Remove the problematic RulesAdminRenderer export for now
// We will handle rendering directly in the route