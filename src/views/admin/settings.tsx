import { FC } from 'hono/jsx';
import { DefaultLayout } from '../layouts/default';
import { UserPayload } from '../../middleware/auth';

type SettingsPageProps = {
  user?: UserPayload | null;
  error?: string | null;
  success?: string | null;
};

export const SettingsPage: FC<SettingsPageProps> = ({ user, error, success }) => {
  return (
    <DefaultLayout title="Settings" user={user}>
      <h2>Global Settings</h2>
      
      {error && <div style="color: red; margin-bottom: 1em; padding: 0.5em; border: 1px solid red; background-color: #ffe6e6;">Error: {error}</div>}
      {success && <div style="color: green; margin-bottom: 1em; padding: 0.5em; border: 1px solid green; background-color: #e6ffe6;">{success}</div>}
      
      <div style="max-width: 600px;">
        <h3>Change Admin Password</h3>
        <form id="changePasswordForm" method="post" action="/admin/api/settings/change-password">
          <div style="margin-bottom: 1em;">
            <label htmlFor="current_password" style="display: block; margin-bottom: 0.5em;">Current Password:</label>
            <input 
              type="password" 
              id="current_password" 
              name="current_password" 
              required 
              style="width: 100%; padding: 0.5em; border: 1px solid #ddd; border-radius: 4px;"
            />
          </div>
          
          <div style="margin-bottom: 1em;">
            <label htmlFor="new_password" style="display: block; margin-bottom: 0.5em;">New Password:</label>
            <input 
              type="password" 
              id="new_password" 
              name="new_password" 
              required 
              style="width: 100%; padding: 0.5em; border: 1px solid #ddd; border-radius: 4px;"
            />
          </div>
          
          <div style="margin-bottom: 1em;">
            <label htmlFor="confirm_new_password" style="display: block; margin-bottom: 0.5em;">Confirm New Password:</label>
            <input 
              type="password" 
              id="confirm_new_password" 
              name="confirm_new_password" 
              required 
              style="width: 100%; padding: 0.5em; border: 1px solid #ddd; border-radius: 4px;"
            />
          </div>
          
          <button 
            type="submit" 
            style="background-color: #007cba; color: white; padding: 0.75em 1.5em; border: none; border-radius: 4px; cursor: pointer;"
          >
            Change Password
          </button>
        </form>
        
        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const newPassword = formData.get('new_password');
            const confirmPassword = formData.get('confirm_new_password');
            
            if (newPassword !== confirmPassword) {
              alert('New passwords do not match!');
              return;
            }
            
            try {
              const response = await fetch('/admin/api/settings/change-password', {
                method: 'POST',
                body: formData
              });
              
              const result = await response.json();
              
              if (response.ok) {
                alert('Password changed successfully!');
                this.reset(); // Clear the form
              } else {
                alert('Error: ' + (result.error || 'Failed to change password'));
              }
            } catch (error) {
              alert('Error: Failed to change password');
            }
          });
        `}} />
        
        <hr style="margin: 2em 0;" />
        
        <h3>System Information</h3>
        <div style="background-color: #f5f5f5; padding: 1em; border-radius: 4px;">
          <p><strong>Application:</strong> HonoProxy</p>
          <p><strong>Environment:</strong> Development</p>
          <p><strong>Admin User:</strong> {user?.id || 'Unknown'}</p>
        </div>
      </div>
    </DefaultLayout>
  );
}; 