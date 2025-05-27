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
    <DefaultLayout title="设置 - HonoProxy" user={user}>
      <div className="page-header">
        <h1><i className="fas fa-cog"></i> 系统设置</h1>
        <p>管理员账户和系统配置</p>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="settings-container">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><i className="fas fa-key"></i> 修改管理员密码</h2>
          </div>
          <div className="card-body">
            <form id="changePasswordForm" method="post" action="/admin/api/settings/change-password">
              <div className="form-group">
                <label htmlFor="current_password">当前密码:</label>
                <input 
                  type="password" 
                  id="current_password" 
                  name="current_password" 
                  className="form-control"
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="new_password">新密码:</label>
                <input 
                  type="password" 
                  id="new_password" 
                  name="new_password" 
                  className="form-control"
                  required 
                />
                <small className="form-text text-muted">请使用强密码，建议包含大小写字母、数字和特殊符号</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="confirm_new_password">确认新密码:</label>
                <input 
                  type="password" 
                  id="confirm_new_password" 
                  name="confirm_new_password" 
                  className="form-control"
                  required 
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  <i className="fas fa-save"></i> 保存新密码
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="card mt-3">
          <div className="card-header">
            <h2 className="card-title"><i className="fas fa-info-circle"></i> 系统信息</h2>
          </div>
          <div className="card-body">
            <div className="system-info">
              <div className="info-row">
                <div className="info-label">应用名称:</div>
                <div className="info-value">HonoProxy</div>
              </div>
              <div className="info-row">
                <div className="info-label">环境:</div>
                <div className="info-value">开发环境</div>
              </div>
              <div className="info-row">
                <div className="info-label">管理员用户:</div>
                <div className="info-value">{user?.id || '未知'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">版本:</div>
                <div className="info-value">1.0.0</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const formData = new FormData(this);
          const newPassword = formData.get('new_password');
          const confirmPassword = formData.get('confirm_new_password');
          
          if (newPassword !== confirmPassword) {
            alert('新密码与确认密码不匹配！');
            return;
          }
          
          try {
            const response = await fetch('/admin/api/settings/change-password', {
              method: 'POST',
              body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
              alert('密码修改成功！');
              this.reset(); // 清空表单
            } else {
              alert('错误: ' + (result.error || '密码修改失败'));
            }
          } catch (error) {
            alert('错误: 密码修改失败');
          }
        });
      `}} />
    </DefaultLayout>
  );
}; 