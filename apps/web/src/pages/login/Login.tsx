import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { DesktopRefreshResponse, RefreshResponse } from '@blueflutes/shared';
import { requestMagicLink, requestOtp, verifyOtp } from '../../api/auth.js';
import { authenticateWithPasskey, listPasskeys, registerPasskey } from '../../api/passkeys.js';
import { ApiError, setAccessToken } from '../../api/client.js';
import { deviceHasPasskey, markDevicePasskey, noteSignedOut, passkeysSupported, shouldAutoPasskey, signedOutHere } from '../../auth/device.js';
import { clearProgress, loadProgress, PROGRESS_TTL_MS, saveProgress } from '../../auth/progress.js';
import { isDesktop } from '../../lib/platform.js';
import { setRefreshToken } from '../../lib/secure-storage.js';
import { useAuthStore } from '../../stores/auth-store.js';

type Step = 'start' | 'email' | 'code' | 'link-sent' | 'passkey-enroll';

// Error codes from the API, in plain words.
const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'That code doesn\'t match, or has expired. Try a new one.',
};

// Auto passkey prompt runs at most once per page load.
let autoTried = false;

export default function Login() {
  const [saved] = useState(loadProgress);
  const [step, setStep] = useState<Step>(() => {
    if (saved?.step) return saved.step;
    return deviceHasPasskey() ? 'start' : 'email';
  });
  const [email, setEmail] = useState(saved?.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(saved?.at ?? 0);
  const [now, setNow] = useState(() => Date.now());
  const [canPasskey, setCanPasskey] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  let cancelAutoFill: (() => void) | null = null;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get('next');
  const nextPath =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/studio/dashboard';

  const errorParam = searchParams.get('error');

  const status = useAuthStore((state) => state.status);
  const setSession = useAuthStore((state) => state.setSession);

  // Don't re-check passkey support on SSR — wait for mount
  useEffect(() => { setCanPasskey(passkeysSupported()); }, []);

  // Focus the first input on each step change
  useEffect(() => { inputRef.current?.focus(); }, [step]);

  // Show error from magic link redirect
  useEffect(() => {
    if (errorParam === 'invalid_link') {
      setError('That sign-in link has expired or was already used. Request a new one.');
    }
  }, [errorParam]);

  // Countdown on code/link-sent steps
  useEffect(() => {
    if (step !== 'code' && step !== 'link-sent') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const left = sentAt ? Math.max(0, PROGRESS_TTL_MS - (now - sentAt)) : null;
  const expired = left === 0;
  const clock = left == null
    ? ''
    : `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;

  // Auto-trigger passkey on 'start' step for returning users
  useEffect(() => {
    const go = shouldAutoPasskey({
      supported: passkeysSupported(),
      deviceHas: deviceHasPasskey(),
      onStartStep: step === 'start',
      signedOutHere: signedOutHere(),
      alreadyTried: autoTried,
    });
    if (!go) return;
    autoTried = true;
    setLoading(true);
    authenticateWithPasskey(undefined)
      .then((result) => {
        if (result) {
          markDevicePasskey(true);
          void handleDone(result);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Resume from saved progress when tab regains visibility (back from email app)
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState !== 'visible') return;
      const p = loadProgress();
      if (!p) return;
      setStep((s) => (s === p.step ? s : p.step));
      if (p.email) setEmail((e) => e || p.email);
      if (p.at) setSentAt((t) => t || p.at);
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
    };
  }, []);

  // Browser passkey autofill on the email step (conditional mediation)
  useEffect(() => {
    if (step !== 'email' || !passkeysSupported()) return;
    let cancelled = false;
    authenticateWithPasskey(undefined, true)
      .then((result) => {
        if (!cancelled && result) {
          markDevicePasskey(true);
          void handleDone(result);
        }
      })
      .catch(() => {});
    cancelAutoFill = () => { cancelled = true; };
    return () => { cancelled = true; };
  }, [step]);

  if (status === 'authenticated' && step !== 'passkey-enroll') {
    return <Navigate to={nextPath} replace />;
  }

  async function handleDone(result: RefreshResponse | DesktopRefreshResponse) {
    if (isDesktop() && 'refreshToken' in result) {
      await setRefreshToken((result as DesktopRefreshResponse).refreshToken);
    }
    setAccessToken(result.accessToken);
    setSession(result.user);
    clearProgress();
    noteSignedOut(false);

    let hasPasskeys = true;
    try {
      const { credentials } = await listPasskeys();
      hasPasskeys = credentials.length > 0;
    } catch {
      hasPasskeys = true;
    }

    if (!hasPasskeys) {
      setStep('passkey-enroll');
    } else {
      navigate(nextPath, { replace: true });
    }
  }

  async function attempt<T>(
    call: () => Promise<T>,
    onSuccess: (result: T) => void | Promise<void>,
  ) {
    setLoading(true);
    setError(null);
    try {
      const result = await call();
      await onSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof ApiError
        ? (MESSAGES[err.code ?? ''] ?? err.message)
        : err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    await attempt(
      () => requestOtp(email.trim()),
      () => {
        setCode('');
        saveProgress('code', email.trim());
        setSentAt(Date.now());
        setNow(Date.now());
        setStep('code');
      },
    );
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    await attempt(
      () => verifyOtp(email.trim(), code.trim()),
      (result) => handleDone(result),
    );
  }

  async function handleSendLink() {
    await attempt(
      () => requestMagicLink(email.trim(), nextPath),
      () => {
        saveProgress('link-sent', email.trim());
        setSentAt(Date.now());
        setNow(Date.now());
        setStep('link-sent');
      },
    );
  }

  async function handlePasskey() {
    setError(null);
    setLoading(true);
    try {
      const result = await authenticateWithPasskey(email.trim() || undefined);
      markDevicePasskey(true);
      await handleDone(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      markDevicePasskey(false);
      if (!msg.includes('NotAllowedError') && !msg.includes('AbortError')) {
        setNote('No passkey on this device? Sign in with an email code, then add one.');
        setStep('email');
      } else {
        setStep('email');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEnrollPasskey() {
    setError(null);
    setLoading(true);
    try {
      await registerPasskey();
      markDevicePasskey(true);
      navigate(nextPath, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('NotAllowedError') && !msg.includes('AbortError')) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not add a passkey on this device. You can add one later in Security settings.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSkipPasskey() {
    navigate(nextPath, { replace: true });
  }

  function handleResend() {
    clearProgress();
    setCode('');
    setSentAt(0);
    setError(null);
    setStep('email');
  }

  const btn =
    'w-full py-[13px] rounded-[10px] font-semibold text-[14.5px] transition-opacity duration-150 disabled:opacity-50';
  const primary = `${btn} bg-ink text-paper hover:opacity-90`;
  const secondary = `${btn} border border-field text-ink hover:bg-field-bg`;
  const link = 'text-[13px] text-ink underline underline-offset-2 hover:text-ink-2';

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-12 animate-pfxFade">
      <div className="w-full max-w-lg">
        <p className="font-serif text-[28px] font-[600] tracking-[-0.015em] text-ink mb-8 text-center">
          Blueflutes
        </p>

        <div className="bg-surface border border-line rounded-[18px] px-9 py-9">

          {/* ── Passkey-first step (returning users) ── */}
          {step === 'start' && (
            <div className="space-y-3">
              <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
                Welcome back
              </h1>
              {canPasskey ? (
                <button
                  onClick={() => void handlePasskey()}
                  disabled={loading}
                  className={`${primary} flex items-center justify-center gap-2`}
                >
                  <KeyIcon />
                  {loading ? 'Waiting for your passkey…' : 'Sign in with a passkey'}
                </button>
              ) : (
                <p className="rounded-xl bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-700 dark:text-amber-300">
                  This browser can&apos;t use passkeys. Continue with an email code instead.
                </p>
              )}
              <button
                onClick={() => setStep('email')}
                disabled={loading}
                className={secondary}
              >
                Use an email code instead
              </button>
              {error && (
                <p role="alert" className="text-[13px] text-red-500 text-center">{error}</p>
              )}
              <p className="text-center text-[12px] text-ink-3">
                Lost your passkey? Use an email code, then add a new one.
              </p>
            </div>
          )}

          {/* ── Email step ── */}
          {step === 'email' && (
            <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-3">
              <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
                Welcome back
              </h1>
              {note ? (
                <p className="rounded-xl bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-700 dark:text-amber-300">
                  {note}
                </p>
              ) : (
                <p className="text-[14.5px] text-ink-3 text-center mb-[10px]">
                  Enter your email to receive a 6-digit sign-in code.
                </p>
              )}
              <input
                ref={inputRef}
                type="email"
                required
                autoFocus
                autoComplete="email webauthn"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-[13px] bg-surface border border-field rounded-[10px] text-[14.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors duration-150"
              />
              {error && (
                <p role="alert" className="text-[13px] text-red-500 text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !email.includes('@')}
                className={primary}
              >
                {loading ? 'Sending…' : 'Email me a code'}
              </button>
              <div className="flex items-center justify-between">
                {canPasskey ? (
                  <button type="button" onClick={() => void handlePasskey()} disabled={loading} className={link}>
                    Use a passkey instead
                  </button>
                ) : <span />}
                <button
                  type="button"
                  onClick={() => void handleSendLink()}
                  disabled={loading || !email.includes('@')}
                  className={link}
                >
                  Email me a link instead
                </button>
              </div>
              <div className="flex items-center gap-3 my-1">
                <span className="flex-1 h-px bg-line" />
                <span className="text-[12px] text-ink-3 uppercase tracking-[0.08em]">or</span>
                <span className="flex-1 h-px bg-line" />
              </div>
              <p className="text-center text-[13px] text-ink-3">
                New here?{' '}
                <Link to="/onboarding" className="text-ink underline underline-offset-2 hover:text-ink-2">
                  Create a studio →
                </Link>
              </p>
            </form>
          )}

          {/* ── Code step ── */}
          {step === 'code' && (
            <form onSubmit={(e) => void handleCodeSubmit(e)} className="space-y-3">
              <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
                Check your email
              </h1>
              {email.includes('@') ? (
                <p className="text-[14.5px] text-ink-3 text-center mb-[10px]">
                  Enter the code we sent to{' '}
                  <span className="font-medium text-ink">{email.trim()}</span>.{' '}
                  {expired
                    ? <span className="text-red-500">That code has expired — send a new one.</span>
                    : clock
                      ? `It expires in ${clock}.`
                      : 'It works for 10 minutes.'
                  }
                </p>
              ) : (
                <>
                  <p className="text-[14.5px] text-ink-3 text-center mb-[10px]">
                    Enter the code from your email, and the address it was sent to.
                  </p>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-[13px] bg-surface border border-field rounded-[10px] text-[14.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors duration-150"
                  />
                </>
              )}
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-[13px] bg-surface border border-field rounded-[10px] text-[22px] font-mono text-ink tracking-[0.2em] text-center placeholder:text-ink-3 placeholder:tracking-[0.2em] focus:outline-none focus:border-ink transition-colors duration-150"
              />
              {error && (
                <p role="alert" className="text-[13px] text-red-500 text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || code.length !== 6 || !email.includes('@') || expired}
                className={primary}
              >
                {loading ? 'Signing in…' : 'Continue'}
              </button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={handleResend} className={link}>
                  Start over
                </button>
                <button
                  type="button"
                  onClick={() => void handleEmailSubmit({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={loading || !email.includes('@')}
                  className={link}
                >
                  Send a new code
                </button>
              </div>
            </form>
          )}

          {/* ── Magic link sent step ── */}
          {step === 'link-sent' && (
            <div className="space-y-3">
              <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
                Check your email
              </h1>
              <p className="text-[14.5px] text-ink-3 text-center">
                Open the link we sent to{' '}
                <span className="font-medium text-ink">{email.trim()}</span> on this device.{' '}
                {expired
                  ? <span className="text-red-500">That link has expired.</span>
                  : clock
                    ? `It works for ${clock}.`
                    : 'It works once, for 10 minutes.'
                }
              </p>
              {error && (
                <p role="alert" className="text-[13px] text-red-500 text-center">{error}</p>
              )}
              <button onClick={handleResend} className={link + ' block mx-auto'}>
                Use a code instead
              </button>
            </div>
          )}

          {/* ── Passkey enrol step ── */}
          {step === 'passkey-enroll' && (
            <div className="space-y-3">
              <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
                Sign in faster next time
              </h1>
              <p className="text-[14.5px] text-ink-3 text-center mb-[10px]">
                Use your device&apos;s biometrics or PIN — no email code needed next time.
              </p>
              {error && (
                <p role="alert" className="text-[13px] text-red-500 text-center">{error}</p>
              )}
              <button
                type="button"
                onClick={() => void handleEnrollPasskey()}
                disabled={loading}
                className={`${primary} flex items-center justify-center gap-2`}
              >
                <KeyIcon />
                {loading ? 'Follow your device…' : 'Enable passkey'}
              </button>
              <button
                type="button"
                onClick={handleSkipPasskey}
                disabled={loading}
                className={secondary}
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function KeyIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="m10.85 12.15 9.15-9.15M18 5l3 3M15 8l3 3" />
    </svg>
  );
}
