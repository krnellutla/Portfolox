import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshAccessToken } from '../api/auth.js';
import { setAccessToken } from '../api/client.js';
import { StateView } from '../components/ui/StateView.js';
import { isDesktop } from '../lib/platform.js';
import { setRefreshToken } from '../lib/secure-storage.js';
import { useAuthStore } from '../stores/auth-store.js';

/**
 * Extracts `refresh_token` from the first deep-link URL that looks like the
 * API's OAuth callback (`blueflutes://auth/callback?...`). Custom URL
 * schemes can't be origin-verified — any locally registered app can invoke
 * `blueflutes://...` — so this is defense-in-depth against unrelated
 * `blueflutes:` links, not a substitute for the server-side mitigations
 * (one-time, single-use, rotated-on-exchange token; stripped from logs).
 */
function extractRefreshToken(urls: string[]): string | null {
  for (const raw of urls) {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'blueflutes:' || `${url.host}${url.pathname}` !== 'auth/callback') continue;
      const token = url.searchParams.get('refresh_token');
      if (token) return token;
    } catch {
      // Not a parseable URL — ignore.
    }
  }
  return null;
}

/**
 * On mount, attempts a silent refresh via the httpOnly refresh cookie (web)
 * or the keychain-stored refresh token (desktop). While that's in flight the
 * app renders a splash screen so protected routes don't briefly flash a
 * logged-out state on page load/reload.
 *
 * On desktop, also listens for the `blueflutes://auth/callback` deep link
 * that the system-browser OAuth flow redirects to: persists the one-time
 * refresh token to the OS keychain, exchanges it for a session, and
 * navigates into the dashboard.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const setStatus = useAuthStore((state) => state.setStatus);
  const setSession = useAuthStore((state) => state.setSession);
  const clear = useAuthStore((state) => state.clear);
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!isDesktop()) return undefined;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
      const stop = await onOpenUrl((urls) => {
        const token = extractRefreshToken(urls);
        if (!token) return;

        void (async () => {
          await setRefreshToken(token);
          const result = await refreshAccessToken();
          if (result) {
            setAccessToken(result.accessToken);
            setSession(result.user);
            navigate('/dashboard');
          } else {
            clear();
          }
        })();
      });

      if (cancelled) {
        stop();
      } else {
        unlisten = stop;
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [navigate, setSession, clear]);

  if (status === 'idle' || status === 'loading') {
    return <StateView variant="loading" title="Loading…" fullScreen />;
  }

  return <>{children}</>;
}
