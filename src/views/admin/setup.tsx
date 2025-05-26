// src/views/admin/setup.tsx
import { FC } from 'hono/jsx';

interface SetupPageProps {
  error?: string | null;
  success?: string | null;
}

export const SetupPage: FC<SetupPageProps> = ({ error, success }) => {
  return (
    <html>
      <head>
        <title>Admin Setup</title>
        {/* Basic styling, or link to admin_styles.css if it's ready */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <h1>Set Up Admin Password</h1>
        {error && <p style="color: red;">Error: {error}</p>}
        {success && <p style="color: green;">{success}</p>}
        <form method="post" action="/admin/api/setup">
          <div>
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" name="password" required />
          </div>
          <div>
            <label htmlFor="confirm_password">Confirm Password:</label>
            <input type="password" id="confirm_password" name="confirm_password" required />
          </div>
          <button type="submit">Set Password</button>
        </form>
      </body>
    </html>
  );
};