import { useEffect, type ReactNode } from 'react';
import { refreshAccessToken } from '../api/auth.js';
import { setAccessToken } from '../api/client.js';
import { useAuthStore } from '../stores/auth-store.js';

/**
 * On mount, attempts a silent refresh via the httpOnly refresh cookie. While
 * that's in flight the app renders a splash screen so protected routes don't
 * briefly flash a logged-out state on page load/reload.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const setStatus = useAuthStore((state) => state.setStatus);
  const setSession = useAuthStore((state) => state.setSession);
  const clear = useAuthStore((state) => state.clear);

  useEffect(() => {
    setStatus('loading');

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

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
