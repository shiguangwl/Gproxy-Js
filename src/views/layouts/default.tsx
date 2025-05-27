// src/views/layouts/default.tsx
import { html } from 'hono/html'; // For raw HTML like DOCTYPE
import { PropsWithChildren, FC } from 'hono/jsx';
import { UserPayload } from '../../middleware/auth'; // Assuming UserPayload is defined here

// Define a type for the layout props, including a potential user
type LayoutProps = PropsWithChildren<{
  title?: string;
  user?: UserPayload | null; // User might be passed from the route context
  // Add other props like currentPath if needed for active nav links
}>;

export const DefaultLayout: FC<LayoutProps> = ({ children, title = 'HonoProxy Admin', user }) => {
  // const c = useRequestContext(); // Can be used to get user from context if set globally
  // const user = c.get('user'); // Example if user is set on context

  return (
    html`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="stylesheet" href="/public/css/admin_styles.css">
        <style>
          body { font-family: sans-serif; margin: 0; display: flex; min-height: 100vh; flex-direction: column; }
          header { background-color: #333; color: white; padding: 1em; }
          nav { display: flex; justify-content: space-between; align-items: center; }
          nav ul { list-style-type: none; padding: 0; margin: 0; display: flex; }
          nav ul li { margin-right: 1em; }
          nav ul li a { color: white; text-decoration: none; }
          nav ul li a:hover { text-decoration: underline; }
          .user-info { color: #ccc; }
          main { flex-grow: 1; padding: 1em; }
          footer { background-color: #f1f1f1; text-align: center; padding: 1em; border-top: 1px solid #ddd;}
        </style>
      </head>
      <body>
        <header>
          <nav>
            <div><a href="/admin/dashboard">HonoProxy Admin</a></div>
            <ul>
              <li><a href="/admin/dashboard">Dashboard</a></li>
              <li><a href="/admin/targets">Targets</a></li>
              <li><a href="/admin/rules">Rules</a></li>
              <li><a href="/admin/async-policies">Async Policies</a></li>
              <li><a href="/admin/settings">Settings</a></li>
            </ul>
            <div class="user-info">
               ${user ? html`<span>Logged in as: ${user.id} | <a href="/admin/api/logout">Logout</a></span>` : html`<a href="/admin/login">Login</a>`}
            </div>
          </nav>
        </header>
        <main>
          ${children}
        </main>
        <footer>
          <p>&copy; ${new Date().getFullYear()} HonoProxy. All rights reserved.</p>
        </footer>
      </body>
    </html>`
  );
};