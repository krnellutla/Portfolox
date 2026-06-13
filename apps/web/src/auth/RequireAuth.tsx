import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store.js';

/**
 * Route guard for protected routes. SessionProvider has already resolved
 * status to 'authenticated' or 'unauthenticated' by the time routes render
 * (it shows its own splash while 'loading'), so this only needs to redirect
 * unauthenticated users to /login.
 */
export function RequireAuth() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
