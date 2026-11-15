import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { refreshAccessToken } from '../../api/auth.js';
import { setAccessToken } from '../../api/client.js';
import { StateView } from '../../components/ui/StateView.js';
import { clearProgress } from '../../auth/progress.js';
import { noteSignedOut } from '../../auth/device.js';
import { useAuthStore } from '../../stores/auth-store.js';

export default function MagicLinkCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawNext = searchParams.get('next');
  const nextPath =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/studio/dashboard';

  useEffect(() => {
    // Always run a fresh refresh — the magic link verification set a new
    // refresh cookie, so we need to exchange it for an access token.
    // This handles both a first-load (new tab) and an in-app navigation.
    refreshAccessToken()
      .then((result) => {
        if (result) {
          setAccessToken(result.accessToken);
          useAuthStore.getState().setSession(result.user);
          clearProgress();
          noteSignedOut(false);
          navigate(nextPath, { replace: true });
        } else {
          setError('Sign-in link has expired or was already used. Please request a new one.');
        }
      })
      .catch(() => {
        setError('Could not complete sign-in. Please try again.');
      });
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-[14.5px] text-red-500">{error}</p>
          <Link
            to="/login"
            className="inline-block text-[14px] text-ink underline underline-offset-2 hover:text-ink-2"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return <StateView variant="loading" title="Signing you in…" fullScreen />;
}
