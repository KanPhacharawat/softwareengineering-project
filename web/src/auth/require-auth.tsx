import { Navigate, Outlet, useLocation } from 'react-router';
import { AppShell, AppShellSkeleton } from '@/components/layout/app-shell';
import { useAuth } from './auth-context';

// Guards every authenticated page: no session -> /login (AC-22). The page the user wanted is kept so login can
// return there.
export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) return <AppShellSkeleton />;
  if (user === null) return <Navigate to="/login" replace state={{ from: location }} />;
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
