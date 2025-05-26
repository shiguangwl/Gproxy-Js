// src/views/admin/async-policies.tsx
import { FC } from 'hono/jsx'; // Import FC
import { DefaultLayout } from '../layouts/default';
import { UserPayload } from '../../middleware/auth';
import { AsyncPolicy, ProxiedTarget } from '../../db'; // Import types

interface AsyncPoliciesPageProps {
  user?: UserPayload | null;
  policiesInitial?: AsyncPolicy[];
  proxiedTargets?: ProxiedTarget[]; // For the dropdown
  error?: string | null;
  message?: string | null;
}

// Define as a standard Functional Component
export const AsyncPoliciesPage: FC<AsyncPoliciesPageProps> = ({ user, policiesInitial = [], proxiedTargets = [], error, message }) => {
  // Client-side script will also fetch proxiedTargets if this array is empty or for updates.
  return (
    <DefaultLayout title="Manage Async Request Policies" user={user}>
      <h2>Manage Async Request Policies</h2>

      {message && <p style="color: green;">{message}</p>}
      {error && <p style="color: red;">Error: {error}</p>}

      <h3>Add/Edit Async Policy</h3>
      <form id="addEditAsyncPolicyForm" style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <input type="hidden" id="policy_id" name="id" />
        <div>
          <label htmlFor="name">Policy Name:</label>
          <input type="text" id="name" name="name" required style={{ width: '100%', marginBottom: '5px' }} />
        </div>
        <div>
          <label htmlFor="target_url_pattern">Target URL Pattern (Regex):</label>
          <input type="text" id="target_url_pattern" name="target_url_pattern" required placeholder="e.g., ^https://api\\.example\\.com/.*" style={{ width: '100%', marginBottom: '5px' }} />
          <small>Use JavaScript compatible regular expressions.</small>
        </div>
        <div>
          <label htmlFor="action">Action:</label>
          <select id="action" name="action" required style={{ marginBottom: '5px' }}>
            <option value="proxy">Proxy</option>
            <option value="direct">Direct</option>
          </select>
        </div>
        <div>
          <label htmlFor="apply_to_target_prefix">Apply to Target Prefix (Optional):</label>
          <select id="apply_to_target_prefix" name="apply_to_target_prefix" style={{ marginBottom: '5px' }}>
            <option value="">All Targets (Global)</option>
            {/* Options will be populated by script or from props */}
            {proxiedTargets.map(pt => <option value={pt.target_url_prefix} key={pt.id}>{pt.target_url_prefix}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="order_priority">Order Priority (0 is highest):</label>
          <input type="number" id="order_priority" name="order_priority" defaultValue="0" style={{ marginBottom: '5px' }} />
        </div>
         <div>
          <input type="checkbox" id="is_active_policy" name="is_active" value="1" defaultChecked />
          <label htmlFor="is_active_policy">Active</label>
        </div>
        <div>
          <label htmlFor="notes_policy">Notes:</label>
          <textarea id="notes_policy" name="notes" style={{ width: '100%', marginBottom: '5px' }}></textarea>
        </div>
        <button type="submit">Save Policy</button>
        <button type="button" id="clearPolicyForm" style={{ marginLeft: '10px' }}>Clear Form</button>
      </form>

      <h3>Current Async Policies</h3>
      <table id="asyncPoliciesTable" border={1} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>URL Pattern</th>
            <th>Action</th>
            <th>Target Prefix</th>
            <th>Priority</th>
            <th>Active</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* Rows populated by script */}
        </tbody>
      </table>

      <script dangerouslySetInnerHTML={{ __html: `
        const policiesTableBody = document.getElementById('asyncPoliciesTable')?.getElementsByTagName('tbody')[0];
        const policyForm = document.getElementById('addEditAsyncPolicyForm');
        const policyIdField = document.getElementById('policy_id');
        const clearFormButton = document.getElementById('clearPolicyForm');
        const applyToTargetPrefixSelect = document.getElementById('apply_to_target_prefix');

        let currentProxiedTargets = ${JSON.stringify(proxiedTargets)};

        function populateTargetPrefixDropdown(targets) {
             if (!applyToTargetPrefixSelect) return;
             const currentValue = applyToTargetPrefixSelect.value;
             applyToTargetPrefixSelect.innerHTML = '<option value="">All Targets (Global)</option>'; // Reset
             targets.forEach(pt => {
                 const option = document.createElement('option');
                 option.value = pt.target_url_prefix;
                 option.textContent = pt.target_url_prefix;
                 applyToTargetPrefixSelect.appendChild(option);
             });
             applyToTargetPrefixSelect.value = currentValue; // Restore selection if possible
        }
        
        async function fetchInitialData() {
             await Promise.all([fetchPolicies(), fetchProxiedTargetsForDropdown()]);
        }

        async function fetchProxiedTargetsForDropdown() {
             try {
                 const response = await fetch('/admin/api/targets', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') }});
                 if (!response.ok) throw new Error('Failed to fetch proxied targets');
                 currentProxiedTargets = await response.json();
                 populateTargetPrefixDropdown(currentProxiedTargets);
             } catch (err) {
                 console.error("Error fetching proxied targets for dropdown:", err);
                 // displayError(err.message); // Optional: display error related to dropdown loading
             }
        }


        async function fetchPolicies() {
          try {
            const response = await fetch('/admin/api/async-policies', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') }});
            if (!response.ok) throw new Error('Failed to fetch policies: ' + response.statusText);
            const policies = await response.json();
            renderPolicies(policies);
          } catch (err) {
            console.error(err);
            displayErrorPolicy(err.message);
          }
        }

        function renderPolicies(policies) {
          if (!policiesTableBody) return;
          policiesTableBody.innerHTML = '';
          policies.forEach(policy => {
            const row = policiesTableBody.insertRow();
            row.setAttribute('data-id', policy.id);
            row.insertCell().textContent = policy.name;
            row.insertCell().textContent = policy.target_url_pattern;
            row.insertCell().textContent = policy.action;
            row.insertCell().textContent = policy.apply_to_target_prefix || 'Global';
            row.insertCell().textContent = policy.order_priority;
            row.insertCell().textContent = policy.is_active ? 'Yes' : 'No';
            row.insertCell().textContent = policy.notes || '';
            const actionsCell = row.insertCell();
            actionsCell.innerHTML = \`
              <button class="edit-policy-btn" data-id="\${policy.id}">Edit</button>
              <button class="delete-policy-btn" data-id="\${policy.id}">Delete</button>
            \`;
          });
          addPolicyEventListeners();
        }

        function displayErrorPolicy(errorMessage) {
             let errorP = document.querySelector('#addEditAsyncPolicyForm + p[style="color: red;"]');
             if (!errorP) {
                 errorP = document.createElement('p');
                 errorP.style.color = 'red';
                 policyForm.insertAdjacentElement('afterend', errorP);
             }
             errorP.textContent = 'Error: ' + errorMessage;
        }
        function displayMessagePolicy(msg) {
             let msgP = document.querySelector('#addEditAsyncPolicyForm + p[style="color: green;"]');
              if (!msgP) {
                 msgP = document.createElement('p');
                 msgP.style.color = 'green';
                 policyForm.insertAdjacentElement('afterend', msgP);
             }
             msgP.textContent = msg;
        }
        
        function resetPolicyForm() {
             policyForm.reset();
             policyIdField.value = '';
             document.getElementById('name').focus();
        }

        clearFormButton?.addEventListener('click', resetPolicyForm);

        policyForm?.addEventListener('submit', async function(e) {
          e.preventDefault();
          const formData = new FormData(this);
          const id = formData.get('id');
          const data = {
             name: formData.get('name'),
             target_url_pattern: formData.get('target_url_pattern'),
             action: formData.get('action'),
             apply_to_target_prefix: formData.get('apply_to_target_prefix') || null, // Send null if empty
             order_priority: parseInt(formData.get('order_priority'), 10) || 0,
             is_active: formData.has('is_active_policy') ? 1 : 0,
             notes: formData.get('notes_policy')
          };

          const method = id ? 'PUT' : 'POST';
          const url = id ? \`/admin/api/async-policies/\${id}\` : '/admin/api/async-policies';

          try {
            const response = await fetch(url, {
              method: method,
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') },
              body: JSON.stringify(data)
            });
            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || \`Failed to \${id ? 'update' : 'add'} policy\`);
            }
            resetPolicyForm();
            fetchPolicies();
            displayMessagePolicy(\`Policy \${id ? 'updated' : 'added'} successfully!\`);
          } catch (err) {
            console.error(err);
            displayErrorPolicy(err.message);
          }
        });

        function addPolicyEventListeners() {
          document.querySelectorAll('.delete-policy-btn').forEach(button => {
            button.addEventListener('click', async function() {
              const policyId = this.dataset.id;
              if (confirm('Are you sure you want to delete this policy?')) {
                try {
                  const response = await fetch(\`/admin/api/async-policies/\${policyId}\`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') }
                  });
                  if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to delete policy');
                  }
                  fetchPolicies();
                  displayMessagePolicy('Policy deleted successfully!');
                } catch (err) {
                  console.error(err);
                  displayErrorPolicy(err.message);
                }
              }
            });
          });

          document.querySelectorAll('.edit-policy-btn').forEach(button => {
            button.addEventListener('click', async function() {
              const policyId = this.dataset.id;
              try {
                 const response = await fetch(\`/admin/api/async-policies/\${policyId}\`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') }});
                 if (!response.ok) throw new Error('Failed to fetch policy details');
                 const policy = await response.json();
                 
                 policyIdField.value = policy.id;
                 document.getElementById('name').value = policy.name;
                 document.getElementById('target_url_pattern').value = policy.target_url_pattern;
                 document.getElementById('action').value = policy.action;
                 document.getElementById('apply_to_target_prefix').value = policy.apply_to_target_prefix || '';
                 document.getElementById('order_priority').value = policy.order_priority;
                 document.getElementById('is_active_policy').checked = !!policy.is_active;
                 document.getElementById('notes_policy').value = policy.notes || '';
                 document.getElementById('name').focus();
              } catch (err) {
                 console.error(err);
                 displayErrorPolicy('Could not load policy for editing: ' + err.message);
              }
            });
          });
        }
        
        document.addEventListener('DOMContentLoaded', fetchInitialData);
      `}} />
    </DefaultLayout>
  );
};