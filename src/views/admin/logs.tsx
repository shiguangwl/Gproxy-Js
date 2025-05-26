// src/views/admin/logs.tsx
import type { FC, PropsWithChildren } from 'hono/jsx';
// jsxRenderer will be used by Hono's c.html() or via middleware, not directly wrapping the component export
import { DefaultLayout } from '../layouts/default';
import { UserPayload } from '../../middleware/auth';
import { RequestLog, ProxiedTarget } from '../../db'; // Import types

export interface LogsPageProps {
  user?: UserPayload | null;
  logsInitial?: RequestLog[];
  totalLogs?: number;
  currentPage?: number;
  limit?: number;
  proxiedTargets?: ProxiedTarget[];
  filterTargetPrefix?: string;
  error?: string | null;
  message?: string | null;
}

const ITEMS_PER_PAGE = 20;

export const LogsPage: FC<PropsWithChildren<LogsPageProps>> = (props) => {
  const { user, logsInitial = [], totalLogs = 0, currentPage = 1, limit = ITEMS_PER_PAGE, proxiedTargets = [], filterTargetPrefix = '', error, message } = props;
  const totalPages = Math.ceil(totalLogs / limit);

  return (
    <DefaultLayout title="Request Logs" user={user}>
      <h2>Request Logs</h2>

      {message && <p style="color: green;">{message}</p>}
      {error && <p style="color: red;">Error: {error}</p>}

      {/* Filters */}
      <form id="logFiltersForm" method="get" action="/admin/logs" style="margin-bottom:15px;">
         <label htmlFor="filterTargetPrefix">Filter by Target Prefix: </label>
         <select name="target_prefix" id="filterTargetPrefix" onchange="this.form.submit()">
             <option value="">All Targets</option>
             {proxiedTargets.map((pt: ProxiedTarget) => <option value={pt.target_url_prefix} selected={pt.target_url_prefix === filterTargetPrefix}>{pt.target_url_prefix}</option>)}
         </select>
         <input type="hidden" name="page" value="1" />
      </form>

      {/* Log List Table */}
      <table id="logsTable" border={1}>
        <thead>
          <tr>
            <th>Timestamp</th><th>Method</th><th>Original URL</th><th>Status</th>
            <th>Duration (ms)</th><th>Cache</th><th>Target Prefix</th><th>Client IP</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {logsInitial.map((log: RequestLog) => (
            <>
              <tr class="log-row" data-log-id={log.id} key={`log-${log.id}`}>
                <td>{new Date(log.timestamp).toLocaleString()}</td><td>{log.request_method}</td>
                <td title={log.original_request_url} style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{log.original_request_url}</td>
                <td>{log.response_status_code || '-'}</td><td>{log.duration_ms}</td>
                <td>{log.cache_status || '-'}</td><td>{log.target_url_prefix || 'N/A'}</td>
                <td>{log.client_ip || '-'}</td>
                <td><button onclick={`toggleLogDetails('${log.id}')`}>Details</button></td>
              </tr>
              <tr id={`details-${log.id}`} class="log-details-row" style="display:none;" key={`details-${log.id}`}>
                <td colSpan={9}>
                  <div style="padding:10px; background-color:#f9f9f9;">
                    <p><strong>ID:</strong> {log.id}</p>
                    <p><strong>Proxied URL:</strong> {log.proxied_request_url}</p>
                    {log.error_message && <p><strong>Error:</strong> <span style="color:red;">{log.error_message}</span></p>}
                    <div><strong>Request Headers:</strong> <pre>{JSON.stringify(JSON.parse(log.request_headers || '{}'), null, 2)}</pre></div>
                    {log.request_body && <div><strong>Request Body:</strong> <pre style="max-height:100px; overflow-y:auto; white-space:pre-wrap; word-break:break-all;">{log.request_body}</pre></div>}
                    {log.response_headers && <div><strong>Response Headers:</strong> <pre>{JSON.stringify(JSON.parse(log.response_headers || '{}'), null, 2)}</pre></div>}
                    {log.response_body && <div><strong>Response Body:</strong> <pre style="max-height:100px; overflow-y:auto; white-space:pre-wrap; word-break:break-all;">{log.response_body}</pre></div>}
                  </div>
                </td>
              </tr>
            </>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div class="pagination" style="margin-top:15px;">
         {currentPage > 1 && <a href={`/admin/logs?page=${currentPage - 1}&target_prefix=${filterTargetPrefix}`}>&laquo; Previous</a>}
         {' '}<span>Page {currentPage} of {totalPages}</span>{' '}
         {currentPage < totalPages && <a href={`/admin/logs?page=${currentPage + 1}&target_prefix=${filterTargetPrefix}`}>Next &raquo;</a>}
      </div>

      {/* Log Management Actions */}
      <h3 style="margin-top: 30px;">Log Management</h3>
      <div style="padding: 10px; border: 1px solid #ccc;">
         <div>
             <label htmlFor="deleteLogsBeforeDate">Delete logs before: </label>
             <input type="date" id="deleteLogsBeforeDate" name="delete_before_date" />
             <button id="deleteLogsBeforeBtn">Delete by Date</button>
             <span id="deleteByDateResult" style="margin-left: 10px;"></span>
         </div>
         <div style="margin-top: 10px;">
             <label htmlFor="clearLogsTargetPrefix">Clear logs for Target Prefix: </label>
             <select id="clearLogsTargetPrefix">
                 <option value="">Select Target Prefix</option>
                 {proxiedTargets.map((pt: ProxiedTarget) => <option value={pt.target_url_prefix}>{pt.target_url_prefix}</option>)}
             </select>
             <button id="clearLogsByPrefixBtn">Clear by Prefix</button>
             <span id="clearByPrefixResult" style="margin-left: 10px;"></span>
         </div>
         <div style="margin-top: 10px;">
             <button id="clearAllLogsBtn" style="color: red;">Clear ALL Logs</button>
             <span id="clearAllResultLogs" style="margin-left: 10px;"></span>
         </div>
      </div>

     <style dangerouslySetInnerHTML={{ __html: `
         table { width: 100%; border-collapse: collapse; } th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
         .log-details-row td { border-bottom: 2px solid #ccc; }
         pre { background-color: #eee; padding: 5px; border-radius: 3px; max-height: 200px; overflow: auto; white-space: pre-wrap; word-break: break-all; }
     `}}></style>
      <script dangerouslySetInnerHTML={{ __html: `
        const logsAuthHeaders = { 'Authorization': 'Bearer ' + localStorage.getItem('jwt_token'), 'Content-Type': 'application/json' };
        let currentProxiedTargetsLogs = ${JSON.stringify(proxiedTargets)};

        (window as any).toggleLogDetails = (logId: string) => {
          const detailsRow = document.getElementById(\`details-\${logId}\`);
          if (detailsRow) {
            detailsRow.style.display = detailsRow.style.display === 'none' ? 'table-row' : 'none';
          }
        };
        
        function displayLogsError(elemOrId: string | HTMLElement, errorMessage: string) {
             const targetElem = typeof elemOrId === 'string' ? document.getElementById(elemOrId) : elemOrId;
             if (!targetElem) return;
             let errorSpan = targetElem.nextElementSibling as HTMLSpanElement | null;
             if (!errorSpan || errorSpan.tagName !== 'SPAN') {
                 errorSpan = document.createElement('span');
                 targetElem.insertAdjacentElement('afterend', errorSpan);
             }
             errorSpan.textContent = 'Error: ' + errorMessage; errorSpan.style.color = 'red';
        }
        function displayLogsMessage(elemOrId: string | HTMLElement, msg: string) {
             const targetElem = typeof elemOrId === 'string' ? document.getElementById(elemOrId) : elemOrId;
             if (!targetElem) return;
             let msgSpan = targetElem.nextElementSibling as HTMLSpanElement | null;
              if (!msgSpan || msgSpan.tagName !== 'SPAN') {
                 msgSpan = document.createElement('span');
                 targetElem.insertAdjacentElement('afterend', msgSpan);
             }
             msgSpan.textContent = msg; msgSpan.style.color = 'green';
        }

        document.getElementById('deleteLogsBeforeBtn')?.addEventListener('click', async () => {
             const dateInput = document.getElementById('deleteLogsBeforeDate') as HTMLInputElement | null;
             const resultSpan = document.getElementById('deleteByDateResult');
             if (!dateInput?.value) {
                if(resultSpan) { resultSpan.textContent = 'Please select a date.'; resultSpan.style.color = 'orange'; }
                return;
             }
             if (!confirm(\`Delete all logs before \${dateInput.value}?\\nThis action CANNOT be undone!\`)) return;
             try {
                 const res = await fetch(\`/admin/api/logs/before/\${dateInput.value}\`, { method: 'DELETE', headers: logsAuthHeaders });
                 const data = await res.json();
                 if (!res.ok) throw new Error(data.error || 'Failed to delete logs by date');
                 if(resultSpan) { resultSpan.textContent = \`Success: \${data.deletedCount} logs deleted.\`; resultSpan.style.color = 'green';}
                 // Consider reloading logs or updating UI
             } catch (err: any) { if(resultSpan) {resultSpan.textContent = 'Error: ' + err.message; resultSpan.style.color = 'red';}}
        });

        document.getElementById('clearLogsByPrefixBtn')?.addEventListener('click', async () => {
             const prefixSelect = document.getElementById('clearLogsTargetPrefix') as HTMLSelectElement | null;
             const resultSpan = document.getElementById('clearByPrefixResult');
             const prefix = prefixSelect?.value;
             if (!prefix) {
                if(resultSpan) { resultSpan.textContent = 'Please select a target prefix.'; resultSpan.style.color = 'orange'; }
                return;
             }
             if (!confirm(\`Clear ALL logs for target "\${prefix}"?\\nThis action CANNOT be undone!\`)) return;
             try {
                 const res = await fetch(\`/admin/api/logs/target/\${encodeURIComponent(prefix)}\`, { method: 'DELETE', headers: logsAuthHeaders });
                 const data = await res.json();
                 if (!res.ok) throw new Error(data.error || 'Failed to clear logs by prefix');
                 if(resultSpan) { resultSpan.textContent = \`Success: \${data.deletedCount} logs cleared for \${prefix}.\`; resultSpan.style.color = 'green'; }
             } catch (err: any) { if(resultSpan) { resultSpan.textContent = 'Error: ' + err.message; resultSpan.style.color = 'red'; } }
        });

        document.getElementById('clearAllLogsBtn')?.addEventListener('click', async () => {
             const resultSpan = document.getElementById('clearAllResultLogs');
             if (!confirm('Are you ABSOLUTELY SURE you want to clear ALL request logs? This cannot be undone.')) return;
             try {
                 const res = await fetch('/admin/api/logs/all', { method: 'DELETE', headers: logsAuthHeaders });
                 const data = await res.json();
                 if (!res.ok) throw new Error(data.error || 'Failed to clear all logs');
                 if(resultSpan) { resultSpan.textContent = \`Success: \${data.deletedCount} total logs cleared.\`; resultSpan.style.color = 'green'; }
             } catch (err: any) { if(resultSpan) { resultSpan.textContent = 'Error: ' + err.message; resultSpan.style.color = 'red'; } }
        });
        
        // Populate target prefix dropdowns if needed (already done by server for filter)
        // function populateLogsTargetDropdowns(targets) { ... }
        // document.addEventListener('DOMContentLoaded', () => { ... });
      `}}></script>
    </DefaultLayout>
  );
};