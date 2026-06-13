import { buttonClasses } from '../../components/ui/Button.js';

/**
 * OAuth sign-in is a full browser navigation (not a fetch) so the provider
 * redirect and callback can set the httpOnly refresh cookie. Relative paths
 * go through the Vite dev proxy (changeOrigin: false) so the API sees the
 * browser's real Host header for tenant resolution.
 */
export default function Login() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-slate-100">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-800 bg-slate-800/50 p-8 shadow-xl">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">PortfolioHub</h1>
          <p className="text-sm text-slate-400">Sign in to manage your portfolio</p>
        </div>

        <div className="space-y-3">
          <a href="/auth/google" className={buttonClasses('primary', 'w-full')}>
            Continue with Google
          </a>
          <a href="/auth/github" className={buttonClasses('secondary', 'w-full')}>
            Continue with GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
