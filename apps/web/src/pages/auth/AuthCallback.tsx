import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { refreshAccessToken } from '../../api/auth.js';
import { setAccessToken } from '../../api/client.js';
import { StateView } from '../../components/ui/StateView.js';
import { useAuthStore } from '../../stores/auth-store.js';

/**
 * Landing page after the OAuth provider redirects back through
 * /auth/:provider/callback, which has already set the refresh cookie and
 * redirected here. Exchanges that cookie for an access token via the same
 * silent-refresh flow used on page load.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const status = useAuthStore((state) => state.status);
  const setSession = useAuthStore((state) => state.setSession);
  const clear = useAuthStore((state) => state.clear);

  const rawNext = searchParams.get('next');
  const nextPath =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/studio/dashboard';

  useEffect(() => {
    refreshAccessToken()
      .then((result) => {
        if (result) {
          setAccessToken(result.accessToken);
          setSession(result.user);
        } else {
          clear();
        }
      })
      .catch(() => {
        clear();
      });
  }, []);

  if (status === 'authenticated') {
    return <Navigate to={nextPath} replace />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <StateView variant="loading" title="Signing in…" fullScreen />;
}
