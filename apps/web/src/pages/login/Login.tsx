import type { MouseEvent } from 'react';
import { buttonClasses } from '../../components/ui/Button.js';
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
 * the app's `portfoliohub://auth/callback` deep link, handled in
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
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-slate-100">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-800 bg-slate-800/50 p-8 shadow-xl">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">PortfolioHub</h1>
          <p className="text-sm text-slate-400">Sign in to manage your portfolio</p>
        </div>

        <div className="space-y-3">
          <a
            href={authUrl('google')}
            onClick={(event) => void handleClick(event, 'google')}
            className={buttonClasses('solid', 'w-full')}
          >
            Continue with Google
          </a>
          <a
            href={authUrl('github')}
            onClick={(event) => void handleClick(event, 'github')}
            className={buttonClasses('outline', 'w-full')}
          >
            Continue with GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
