// src/views/admin/login.tsx
import { FC } from 'hono/jsx'; // Import FC for functional components

interface LoginPageProps {
  error?: string | null;
  message?: string | null;
}

export const LoginPage: FC<LoginPageProps> = ({ error, message }) => {
  return (
    <html>
      <head>
        <title>HonoProxy - 管理员登录</title>
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
          
          .login-container {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: var(--shadow);
            padding: 2rem;
            width: 100%;
            max-width: 400px;
            animation: fadeIn 0.4s ease-out;
          }
          
          .login-header {
            text-align: center;
            margin-bottom: 2rem;
          }
          
          .login-header h1 {
            color: var(--primary-color);
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
          }
          
          .login-header .logo {
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
        <div className="login-container">
          <div className="login-header">
            <div className="logo">
              <i className="fas fa-exchange-alt"></i>
            </div>
            <h1>HonoProxy 管理登录</h1>
            <p>动态配置型边缘 Web 代理</p>
          </div>
          
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-danger">错误: {error}</div>}
          
          <form id="loginForm" method="post" action="/admin/api/login">
            <div className="form-group">
              <label htmlFor="password">管理员密码:</label>
              <input type="password" id="password" name="password" required />
            </div>
            <button type="submit" className="btn">
              <i className="fas fa-sign-in-alt"></i> 登录
            </button>
          </form>
          
          <div className="footer">
            &copy; {new Date().getFullYear()} HonoProxy - 动态配置型边缘 Web 代理
          </div>
        </div>
        
        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const response = await fetch('/admin/api/login', {
              method: 'POST',
              body: formData
            });
            const result = await response.json();
            if (response.ok && result.token) {
              // 存储 JWT token
              localStorage.setItem('jwt_token', result.token);
              window.location.href = '/admin/dashboard'; // 重定向
            } else {
              // 显示错误信息
              const errorDiv = document.querySelector('.alert-danger');
              const errorMessage = '错误: ' + (result.error || '登录失败');
              
              if (errorDiv) {
                errorDiv.textContent = errorMessage;
              } else {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-danger';
                alertDiv.textContent = errorMessage;
                
                const loginHeader = document.querySelector('.login-header');
                loginHeader.insertAdjacentElement('afterend', alertDiv);
              }
            }
          });
        `}} />
      </body>
    </html>
  );
};