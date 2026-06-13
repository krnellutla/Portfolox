/**
 * OAuth sign-in is a full browser navigation (not a fetch) so the provider
 * redirect and callback can set the httpOnly refresh cookie. Relative paths
 * go through the Vite dev proxy (changeOrigin: false) so the API sees the
 * browser's real Host header for tenant resolution.
 */
export default function Login() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-slate-800 p-8 shadow-lg">
        <h1 className="text-xl font-semibold">Sign in to PortfolioHub</h1>
        <a
          href="/auth/google"
          className="block w-full rounded-md bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-900 hover:bg-white"
        >
          Continue with Google
        </a>
        <a
          href="/auth/github"
          className="block w-full rounded-md bg-slate-700 px-4 py-2 text-center text-sm font-medium text-slate-100 hover:bg-slate-600"
        >
          Continue with GitHub
        </a>
      </div>
    </main>
  );
}
