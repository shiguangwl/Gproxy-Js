// src/views/admin/targets.tsx
   import { FC } from 'hono/jsx';
   import { DefaultLayout } from '../layouts/default';
   import { UserPayload } from '../../middleware/auth';
   import { ProxiedTarget } from '../../db'; // Assuming ProxiedTarget type is exported from db

   interface TargetsPageProps {
     user?: UserPayload | null;
     targetsInitial?: ProxiedTarget[]; // For server-side rendering if desired, or client fetches
     error?: string | null;
     message?: string | null;
     // children prop is implicitly handled by FC type
   }

   export const TargetsPage: FC<TargetsPageProps> = ({ user, targetsInitial = [], error, message }) => {
     return (
       <DefaultLayout title="Manage Proxied Targets" user={user}>
         <h2>Manage Proxied Targets</h2>

         {message && <p style="color: green;">{message}</p>}
         {error && <p style="color: red;">Error: {error}</p>}

         {/* Add New Target Form */}
         <h3>Add New Target</h3>
         <form id="addTargetForm" style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc;">
           <div>
             <label htmlFor="target_url_prefix">Target URL Prefix (e.g., https://example.com/api):</label>
             <input type="url" id="target_url_prefix" name="target_url_prefix" required style="width: 100%; margin-bottom: 5px;" />
           </div>
           <div>
             <input type="checkbox" id="is_active" name="is_active" value="1" defaultChecked />
             <label htmlFor="is_active">Active</label>
           </div>
           <div>
             <input type="checkbox" id="enable_js_injection" name="enable_js_injection" value="1" />
             <label htmlFor="enable_js_injection">Enable JS Injection</label>
           </div>
           <div>
             <label htmlFor="notes">Notes:</label>
             <textarea id="notes" name="notes" style="width: 100%; margin-bottom: 5px;"></textarea>
           </div>
           <button type="submit">Add Target</button>
         </form>

         <h3>Current Targets</h3>
         <table id="targetsTable" border={1} style="width: 100%; border-collapse: collapse;">
           <thead>
             <tr>
               <th>Prefix</th>
               <th>Active</th>
               <th>JS Injection</th>
               <th>Notes</th>
               <th>Actions</th>
             </tr>
           </thead>
           <tbody>
             {/* Rows will be populated by client-side script */}
             {targetsInitial.map((target: ProxiedTarget) => (
                <tr key={target.id} data-id={target.id}>
                    <td>{target.target_url_prefix}</td>
                    <td>{target.is_active ? 'Yes' : 'No'}</td>
                    <td>{target.enable_js_injection ? 'Yes' : 'No'}</td>
                    <td>{target.notes}</td>
                    <td>
                        <button class="edit-btn" data-id={target.id}>Edit</button>
                        <button class="delete-btn" data-id={target.id}>Delete</button>
                    </td>
                </tr>
             ))}
           </tbody>
         </table>

         {/* Client-side script for fetching, adding, deleting */}
         <script dangerouslySetInnerHTML={{ __html: `
           const tableBody = document.getElementById('targetsTable')?.getElementsByTagName('tbody')[0];
           const addTargetForm = document.getElementById('addTargetForm');

           async function fetchTargets() {
             try {
               const response = await fetch('/admin/api/targets');
               if (!response.ok) throw new Error('Failed to fetch targets: ' + response.statusText);
               const targets = await response.json();
               renderTargets(targets);
             } catch (err) {
               console.error(err);
               displayError(err.message);
             }
           }

           function renderTargets(targets) {
             if (!tableBody) return;
             tableBody.innerHTML = ''; // Clear existing rows
             targets.forEach(target => {
               const row = tableBody.insertRow();
               row.setAttribute('data-id', target.id);
               row.insertCell().textContent = target.target_url_prefix;
               row.insertCell().textContent = target.is_active ? 'Yes' : 'No';
               row.insertCell().textContent = target.enable_js_injection ? 'Yes' : 'No';
               row.insertCell().textContent = target.notes || '';
               const actionsCell = row.insertCell();
               actionsCell.innerHTML = \\\`
                 <button class="edit-btn" data-id="\\\${target.id}">Edit</button>
                 <button class="delete-btn" data-id="\\\${target.id}">Delete</button>
               \\\`;
             });
             addEventListenersToButtons();
           }
           
           function displayError(errorMessage) {
                let errorP = document.querySelector('p[style="color: red;"]');
                if (!errorP) {
                    errorP = document.createElement('p');
                    errorP.style.color = 'red';
                    const h2 = document.querySelector('h2');
                    h2.insertAdjacentElement('afterend', errorP);
                }
                errorP.textContent = 'Error: ' + errorMessage;
           }
            function displayMessage(msg) {
                let msgP = document.querySelector('p[style="color: green;"]');
                if (!msgP) {
                    msgP = document.createElement('p');
                    msgP.style.color = 'green';
                    const h2 = document.querySelector('h2');
                    h2.insertAdjacentElement('afterend', msgP);
                }
                msgP.textContent = msg;
            }


           addTargetForm?.addEventListener('submit', async function(e) {
             e.preventDefault();
             const formData = new FormData(this);
             const data = Object.fromEntries(formData.entries());
             // Convert checkbox values
             data.is_active = formData.has('is_active') ? 1 : 0;
             data.enable_js_injection = formData.has('enable_js_injection') ? 1 : 0;
             
             try {
               const response = await fetch('/admin/api/targets', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') },
                 body: JSON.stringify(data)
               });
               if (!response.ok) {
                 const errData = await response.json();
                 throw new Error(errData.error || 'Failed to add target');
               }
               this.reset();
               fetchTargets(); // Refresh list
               displayMessage('Target added successfully!');
             } catch (err) {
               console.error(err);
               displayError(err.message);
             }
           });

           function addEventListenersToButtons() {
             document.querySelectorAll('.delete-btn').forEach(button => {
               button.addEventListener('click', async function() {
                 const targetId = this.dataset.id;
                 if (confirm('Are you sure you want to delete this target?')) {
                   try {
                     const response = await fetch(\\\`/admin/api/targets/\\\${targetId}\\\`, {
                       method: 'DELETE',
                       headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token') }
                     });
                     if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.error || 'Failed to delete target');
                     }
                     fetchTargets(); // Refresh list
                     displayMessage('Target deleted successfully!');
                   } catch (err) {
                     console.error(err);
                     displayError(err.message);
                   }
                 }
               });
             });

             document.querySelectorAll('.edit-btn').forEach(button => {
               button.addEventListener('click', function() {
                 const targetId = this.dataset.id;
                 // Placeholder for edit functionality
                 // Could populate the 'Add New Target' form for editing, or redirect
                 alert('Edit functionality for target ' + targetId + ' is not yet implemented. You can implement it by populating the form above or creating a new edit page/modal.');
                 // Example: Fetch target details and populate form
                 // fetch(\\\`/admin/api/targets/\\\${targetId}\\\`).then(res => res.json()).then(data => {
                 //   document.getElementById('target_url_prefix').value = data.target_url_prefix;
                 //   document.getElementById('is_active').checked = data.is_active;
                 //   // ... and so on, then change form to "Update Target" mode
                 // });
               });
             });
           }

           document.addEventListener('DOMContentLoaded', () => {
             fetchTargets();
           });
         `}} />
       </DefaultLayout>
     );
   };