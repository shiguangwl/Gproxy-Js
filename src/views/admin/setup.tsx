// src/views/admin/setup.tsx
import { FC } from 'hono/jsx';
import { html } from 'hono/html';

interface SetupPageProps {
  error?: string | null;
  success?: string | null;
}

export const SetupPage: FC<SetupPageProps> = ({ error, success }) => {
  return (
    <html>
      <head>
        <title>HonoProxy - 初始设置</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style>{`
          :root {
            --primary-color: #3498db;
            --primary-dark: #2980b9;
            --text-color: #333;
            --background-color: #f5f7fa;
            --card-bg: #ffffff;
            --border-color: #e1e8ed;
            --shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s ease;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--background-color);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 1rem;
          }
          
          .setup-container {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: var(--shadow);
            padding: 2rem;
            width: 100%;
            max-width: 500px;
            animation: fadeIn 0.4s ease-out;
          }
          
          .setup-header {
            text-align: center;
            margin-bottom: 2rem;
          }
          
          .setup-header h1 {
            color: var(--primary-color);
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
          }
          
          .setup-header .logo {
            font-size: 2.5rem;
            color: var(--primary-color);
            margin-bottom: 1rem;
          }
          
          .form-group {
            margin-bottom: 1.5rem;
          }
          
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
          }
          
          input[type="password"] {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 1rem;
            transition: var(--transition);
          }
          
          input[type="password"]:focus {
            border-color: var(--primary-color);
            outline: none;
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
          }
          
          .btn {
            display: block;
            width: 100%;
            padding: 0.75rem;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            text-align: center;
          }
          
          .btn:hover {
            background-color: var(--primary-dark);
          }
          
          .alert {
            padding: 0.75rem;
            border-radius: 4px;
            margin-bottom: 1.5rem;
          }
          
          .alert-success {
            background-color: rgba(46, 204, 113, 0.2);
            border: 1px solid #2ecc71;
            color: #27ae60;
          }
          
          .alert-danger {
            background-color: rgba(231, 76, 60, 0.2);
            border: 1px solid #e74c3c;
            color: #c0392b;
          }
          
          .form-text {
            margin-top: 0.25rem;
            font-size: 0.875rem;
            color: #666;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .footer {
            text-align: center;
            margin-top: 2rem;
            font-size: 0.9rem;
            color: #7f8c8d;
          }
        `}</style>
      </head>
      <body>
        <div className="setup-container">
          <div className="setup-header">
            <div className="logo">
              <i className="fas fa-exchange-alt"></i>
            </div>
            <h1>HonoProxy 初始设置</h1>
            <p>请设置您的管理员密码</p>
          </div>
          
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form method="post" action="/admin/api/setup">
            <div className="form-group">
              <label htmlFor="password">管理员密码:</label>
              <input type="password" id="password" name="password" required />
              <div className="form-text">请设置一个强密码，至少包含8个字符</div>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirm_password">确认密码:</label>
              <input type="password" id="confirm_password" name="confirm_password" required />
            </div>
            
            <button type="submit" className="btn">
              <i className="fas fa-key"></i> 设置密码并继续
            </button>
          </form>
          
          <div className="footer">
            &copy; {new Date().getFullYear()} HonoProxy - 动态配置型边缘 Web 代理
          </div>
        </div>
      </body>
    </html>
  );
};