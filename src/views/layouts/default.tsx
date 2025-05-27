// src/views/layouts/default.tsx
import { PropsWithChildren, FC } from 'hono/jsx';
import { UserPayload } from '../../middleware/auth'; // Assuming UserPayload is defined here

// Define a type for the layout props, including a potential user
type LayoutProps = PropsWithChildren<{
  title?: string;
  user?: UserPayload | null; // User might be passed from the route context
  // Add other props like currentPath if needed for active nav links
}>;

export const DefaultLayout: FC<LayoutProps> = ({ children, title = 'HonoProxy Admin', user }) => {
  // 服务端渲染时无法获取当前路径，客户端脚本会处理导航高亮
  const currentPath = '';
  
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style>{`
          /* 基础样式 */
          :root {
            --primary-color: #3498db;
            --primary-dark: #2980b9;
            --secondary-color: #2ecc71;
            --secondary-dark: #27ae60;
            --danger-color: #e74c3c;
            --danger-dark: #c0392b;
            --warning-color: #f39c12;
            --warning-dark: #d35400;
            --text-color: #333;
            --text-light: #666;
            --text-lighter: #999;
            --background-color: #f5f7fa;
            --card-bg: #ffffff;
            --border-color: #e1e8ed;
            --header-bg: #2c3e50;
            --header-text: #ecf0f1;
            --sidebar-bg: #34495e;
            --sidebar-text: #ecf0f1;
            --sidebar-active: #3498db;
            --footer-bg: #2c3e50;
            --footer-text: #ecf0f1;
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
            flex-direction: column;
            min-height: 100vh;
          }
          
          a {
            color: var(--primary-color);
            text-decoration: none;
            transition: var(--transition);
          }
          
          a:hover {
            color: var(--primary-dark);
          }
          
          /* 布局 */
          header {
            background-color: var(--header-bg);
            color: var(--header-text);
            padding: 0;
            box-shadow: var(--shadow);
            position: sticky;
            top: 0;
            z-index: 1000;
          }
          
          nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 2rem;
          }
          
          .logo {
            font-size: 1.5rem;
            font-weight: bold;
          }
          
          .logo a {
            color: var(--header-text);
            display: flex;
            align-items: center;
          }
          
          .logo a:hover {
            color: var(--primary-color);
          }
          
          .logo svg, .logo i {
            margin-right: 0.5rem;
          }
          
          nav ul {
            list-style-type: none;
            display: flex;
            margin: 0;
            padding: 0;
          }
          
          nav ul li {
            margin: 0 0.5rem;
          }
          
          nav ul li a {
            color: var(--header-text);
            padding: 1rem 1rem;
            display: block;
            border-bottom: 3px solid transparent;
          }
          
          nav ul li a:hover,
          nav ul li a.active {
            border-bottom: 3px solid var(--primary-color);
            color: var(--primary-color);
          }
          
          nav ul li a i {
            margin-right: 0.5rem;
          }
          
          .user-info {
            color: var(--header-text);
            display: flex;
            align-items: center;
          }
          
          .user-info span {
            margin-right: 1rem;
          }
          
          main {
            flex: 1;
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
          }
          
          footer {
            background-color: var(--footer-bg);
            color: var(--footer-text);
            text-align: center;
            padding: 1rem;
            margin-top: auto;
          }
          
          /* 卡片组件 */
          .card {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: var(--shadow);
            padding: 0;
            margin-bottom: 1.5rem;
            overflow: hidden;
          }
          
          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
            background-color: rgba(52, 152, 219, 0.05);
          }
          
          .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-color);
            margin: 0;
          }
          
          .card-title i {
            margin-right: 0.5rem;
            color: var(--primary-color);
          }
          
          .card-body {
            padding: 1.5rem;
          }
          
          /* 表单样式 */
          .form-group {
            margin-bottom: 1.5rem;
          }
          
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
          }
          
          .form-control,
          input[type="text"],
          input[type="password"],
          input[type="email"],
          input[type="number"],
          textarea,
          select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 1rem;
            transition: var(--transition);
          }
          
          .form-control:focus,
          input[type="text"]:focus,
          input[type="password"]:focus,
          input[type="email"]:focus,
          input[type="number"]:focus,
          textarea:focus,
          select:focus {
            border-color: var(--primary-color);
            outline: none;
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
          }
          
          .form-text {
            font-size: 0.875rem;
            margin-top: 0.25rem;
            display: block;
          }
          
          .text-muted {
            color: var(--text-lighter);
          }
          
          .form-actions {
            margin-top: 1.5rem;
            display: flex;
            gap: 1rem;
          }
          
          /* 按钮样式 */
          .btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            text-align: center;
          }
          
          .btn i {
            margin-right: 0.5rem;
          }
          
          .btn-primary {
            background-color: var(--primary-color);
            color: white;
          }
          
          .btn-primary:hover {
            background-color: var(--primary-dark);
          }
          
          .btn-secondary {
            background-color: var(--secondary-color);
            color: white;
          }
          
          .btn-secondary:hover {
            background-color: var(--secondary-dark);
          }
          
          .btn-danger {
            background-color: var(--danger-color);
            color: white;
          }
          
          .btn-danger:hover {
            background-color: var(--danger-dark);
          }
          
          /* 提示框 */
          .alert {
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
          }
          
          .alert i {
            margin-right: 0.75rem;
            font-size: 1.25rem;
          }
          
          .alert-success {
            background-color: rgba(46, 204, 113, 0.2);
            border: 1px solid var(--secondary-color);
            color: var(--secondary-dark);
          }
          
          .alert-danger {
            background-color: rgba(231, 76, 60, 0.2);
            border: 1px solid var(--danger-color);
            color: var(--danger-dark);
          }
          
          /* 页面标题 */
          .page-header {
            margin-bottom: 2rem;
          }
          
          .page-header h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            color: var(--text-color);
            display: flex;
            align-items: center;
          }
          
          .page-header h1 i {
            margin-right: 0.75rem;
            color: var(--primary-color);
          }
          
          .page-header p {
            color: var(--text-light);
            font-size: 1.1rem;
          }
          
          /* 系统信息样式 */
          .system-info {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .info-row {
            display: flex;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.75rem;
          }
          
          .info-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }
          
          .info-label {
            flex: 1;
            font-weight: 500;
            color: var(--text-light);
          }
          
          .info-value {
            flex: 2;
          }
          
          /* 表格样式 */
          .table-container {
            overflow-x: auto;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
          }
          
          th {
            background-color: rgba(52, 152, 219, 0.1);
            font-weight: 600;
          }
          
          tr:hover {
            background-color: rgba(52, 152, 219, 0.05);
          }
          
          /* 工具类 */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .mt-1 { margin-top: 0.5rem; }
          .mt-2 { margin-top: 1rem; }
          .mt-3 { margin-top: 1.5rem; }
          .mb-1 { margin-bottom: 0.5rem; }
          .mb-2 { margin-bottom: 1rem; }
          .mb-3 { margin-bottom: 1.5rem; }
          .flex { display: flex; }
          .flex-between { justify-content: space-between; }
          .flex-center { justify-content: center; }
          .items-center { align-items: center; }
          .gap-1 { gap: 0.5rem; }
          .gap-2 { gap: 1rem; }
          
          /* 设置页面特定样式 */
          .settings-container {
            max-width: 800px;
            margin: 0 auto;
          }
          
          /* 动画效果 */
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
          
          .fade-in {
            animation: fadeIn 0.3s ease-out;
          }
          
          /* 响应式设计 */
          @media (max-width: 768px) {
            nav {
              flex-direction: column;
              padding: 0.5rem;
            }
            
            nav ul {
              margin: 1rem 0;
              flex-wrap: wrap;
              justify-content: center;
            }
            
            .user-info {
              margin-top: 1rem;
            }
            
            main {
              padding: 1rem;
            }
          }
        `}</style>
      </head>
      <body>
        <header>
          <nav>
            <div className="logo">
              <a href="/admin/dashboard">
                <i className="fas fa-exchange-alt"></i>
                HonoProxy
              </a>
            </div>
            <ul>
              <li><a href="/admin/dashboard">
                <i className="fas fa-tachometer-alt"></i> 仪表盘
              </a></li>
              <li><a href="/admin/targets">
                <i className="fas fa-bullseye"></i> 代理目标
              </a></li>
              <li><a href="/admin/rules">
                <i className="fas fa-filter"></i> 规则
              </a></li>
              <li><a href="/admin/async-policies">
                <i className="fas fa-network-wired"></i> 异步策略
              </a></li>
              <li><a href="/admin/cache">
                <i className="fas fa-database"></i> 缓存
              </a></li>
              <li><a href="/admin/logs">
                <i className="fas fa-clipboard-list"></i> 日志
              </a></li>
              <li><a href="/admin/settings">
                <i className="fas fa-cog"></i> 设置
              </a></li>
            </ul>
            <div className="user-info">
               {user ? (
                 <span><i className="fas fa-user"></i> {user.id} | <a href="/admin/api/logout"><i className="fas fa-sign-out-alt"></i> 退出</a></span>
               ) : (
                 <a href="/admin/login"><i className="fas fa-sign-in-alt"></i> 登录</a>
               )}
            </div>
          </nav>
        </header>
        <main className="fade-in">
          {children}
        </main>
        <footer>
          <p>&copy; {new Date().getFullYear()} HonoProxy - 动态配置型边缘 Web 代理</p>
        </footer>
        
        <script dangerouslySetInnerHTML={{ __html: `
          // 为当前页面的导航项添加活跃状态
          document.addEventListener('DOMContentLoaded', function() {
            const currentPath = window.location.pathname;
            const navLinks = document.querySelectorAll('nav ul li a');
            
            navLinks.forEach(link => {
              if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
              }
            });
          });
        `}} />
      </body>
    </html>
  );
};