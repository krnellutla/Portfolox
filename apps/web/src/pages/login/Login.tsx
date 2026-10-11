import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { env } from '../../config/env.js';
import { isDesktop } from '../../lib/platform.js';

type Provider = 'google' | 'github';

function authUrl(provider: Provider): string {
  const query = isDesktop() ? '?client=desktop' : '';
  return `${env.VITE_API_BASE_URL}/auth/${provider}${query}`;
}

/**
 * On the web, OAuth sign-in is a full browser navigation (not a fetch) so the
 * provider redirect and callback can set the httpOnly refresh cookie.
 * Relative paths go through the Vite dev proxy (changeOrigin: false) so the
 * API sees the browser's real Host header for tenant resolution.
 *
 * On desktop, the embedded webview can't receive the httpOnly cookie or
 * complete a provider redirect back into itself, so the link instead opens
 * the system browser (`?client=desktop`); the API redirects the result to
 * the app's `blueflutes://auth/callback` deep link, handled in
 * SessionProvider.
 */
async function handleClick(event: MouseEvent<HTMLAnchorElement>, provider: Provider) {
  if (!isDesktop()) return;
  event.preventDefault();
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(authUrl(provider));
}

export default function Login() {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-12 animate-pfxFade">
      <div className="w-full max-w-lg">
        {/* Wordmark */}
        <p className="font-serif text-[28px] font-[600] tracking-[-0.015em] text-ink mb-8 text-center">
          Blueflutes
        </p>

        <div className="bg-surface border border-line rounded-[18px] px-9 py-9">
          <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
            Welcome back
          </h1>
          <p className="text-[14.5px] text-ink-3 text-center mb-[26px]">
            Sign in to your studio.
          </p>

          <div className="flex flex-col gap-[11px] mb-[24px]">
            <a
              href={authUrl('github')}
              onClick={(event) => void handleClick(event, 'github')}
              className="w-full py-[13px] bg-surface border border-field rounded-[10px] font-semibold text-[14.5px] text-ink hover:border-ink transition-colors duration-150 text-center block"
            >
              Continue with GitHub
            </a>
            <a
              href={authUrl('google')}
              onClick={(event) => void handleClick(event, 'google')}
              className="w-full py-[13px] bg-surface border border-field rounded-[10px] font-semibold text-[14.5px] text-ink hover:border-ink transition-colors duration-150 text-center block"
            >
              Continue with Google
            </a>
          </div>

          <p className="text-center text-[13px] text-ink-3">
            New here?{' '}
            <Link to="/onboarding" className="text-ink underline underline-offset-2 hover:text-ink-2">
              Create a studio →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
