// src/views/admin/dashboard.tsx
import { FC } from 'hono/jsx';
import { DefaultLayout } from '../layouts/default';
import { UserPayload } from '../../middleware/auth';

type DashboardPageProps = {
  user?: UserPayload | null;
};

export const DashboardPage: FC<DashboardPageProps> = ({ user }) => {
  return (
    <DefaultLayout title="Admin Dashboard" user={user}>
      <h2>Welcome to the HonoProxy Dashboard!</h2>
      {user && <p>You are logged in as: {user.id}</p>}
      <p>This is where you will manage your proxy settings.</p>
      {/* Placeholder for future content */}
    </DefaultLayout>
  );
};