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
        <title>Admin Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Link to admin_styles.css */}
      </head>
      <body>
        <h1>Admin Login</h1>
        {message && <p style="color: blue;">{message}</p>}
        {error && <p style="color: red;">Error: {error}</p>}
        {/* This form will submit traditionally. For JWT handling, client-side JS is better. */}
        <form id="loginForm" method="post" action="/admin/api/login">
          {/* <div>
            <label htmlFor="username">Username:</label>
            <input type="text" id="username" name="username" defaultValue="admin" required />
          </div> */}
          <div>
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" name="password" required />
          </div>
          <button type="submit">Login</button>
        </form>
        {/* Script to handle API response if form action points to an API returning JSON */}
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
              localStorage.setItem('jwt_token', result.token); // Example: store in localStorage
              window.location.href = '/admin/dashboard'; // Redirect
            } else {
              // Update error message on the page
              const errorP = document.querySelector('p[style="color: red;"]');
              if (errorP) errorP.textContent = 'Error: ' + (result.error || 'Login failed.');
              else {
                 const h1 = document.querySelector('h1');
                 const newErrorP = document.createElement('p');
                 newErrorP.style.color = 'red';
                 newErrorP.textContent = 'Error: ' + (result.error || 'Login failed.');
                 h1.insertAdjacentElement('afterend', newErrorP);
              }
            }
          });
        `}} />
      </body>
    </html>
  );
}