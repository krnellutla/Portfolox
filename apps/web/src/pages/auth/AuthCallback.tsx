import { Navigate, useSearchParams } from 'react-router-dom';
import { StateView } from '../../components/ui/StateView.js';
import { useAuthStore } from '../../stores/auth-store.js';

/**
 * Landing page after the OAuth provider redirects back through
 * /auth/:provider/callback, which has already set the refresh cookie and
 * redirected here.
 *
 * SessionProvider (the parent) blocks rendering until its own silent-refresh
 * resolves, so by the time this component mounts, status is already
 * 'authenticated' or 'unauthenticated' — no second refresh needed here.
 * A redundant refresh would rotate the cookie a second time and, if that
 * rotation failed, would call clear() and log the user out immediately after
 * a successful login.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const status = useAuthStore((state) => state.status);

  const rawNext = searchParams.get('next');
  const nextPath =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/studio/dashboard';

  console.debug('[auth] AuthCallback: rendered', { status, nextPath });

  if (status === 'authenticated') {
    console.debug('[auth] AuthCallback: authenticated — navigating to', nextPath);
    return <Navigate to={nextPath} replace />;
  }

  if (status === 'unauthenticated') {
    console.debug('[auth] AuthCallback: unauthenticated — redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  return <StateView variant="loading" title="Signing in…" fullScreen />;
}
