import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { requestOtp, verifyOtp } from '../../api/auth.js';
import { isDesktop } from '../../lib/platform.js';
import { setRefreshToken } from '../../lib/secure-storage.js';
import { setAccessToken } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth-store.js';

type Step = 'email' | 'code';

export default function Login() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const setSession = useAuthStore((state) => state.setSession);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await requestOtp(email);
      setExpiresAt(new Date(result.expiresAt));
      setStep('code');
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await verifyOtp(email, code);
      // For desktop the refresh token is in the body; store it in the keychain
      if (isDesktop() && 'refreshToken' in result) {
        await setRefreshToken(result.refreshToken as string);
      }
      setAccessToken(result.accessToken);
      setSession(result.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleResend() {
    setCode('');
    setError(null);
    setStep('email');
  }

  const minutesLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 60_000))
    : 5;

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-12 animate-pfxFade">
      <div className="w-full max-w-lg">
        <p className="font-serif text-[28px] font-[600] tracking-[-0.015em] text-ink mb-8 text-center">
          Blueflutes
        </p>

        <div className="bg-surface border border-line rounded-[18px] px-9 py-9">
          {step === 'email' ? (
            <>
              <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
                Welcome back
              </h1>
              <p className="text-[14.5px] text-ink-3 text-center mb-[26px]">
                Enter your email to receive a sign-in code.
              </p>

              <form onSubmit={(e) => void handleEmailSubmit(e)} className="flex flex-col gap-[11px]">
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-[13px] bg-surface border border-field rounded-[10px] text-[14.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors duration-150"
                />

                {error && (
                  <p className="text-[13px] text-red-500 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-[13px] bg-ink text-paper rounded-[10px] font-semibold text-[14.5px] hover:opacity-90 transition-opacity duration-150 disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Continue'}
                </button>
              </form>

              <p className="text-center text-[13px] text-ink-3 mt-6">
                New here?{' '}
                <Link to="/onboarding" className="text-ink underline underline-offset-2 hover:text-ink-2">
                  Create a studio →
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
                Check your email
              </h1>
              <p className="text-[14.5px] text-ink-3 text-center mb-[26px]">
                We sent a 6-digit code to{' '}
                <span className="text-ink font-medium">{email}</span>.
                {minutesLeft > 0 && ` It expires in ${minutesLeft} min.`}
              </p>

              <form onSubmit={(e) => void handleCodeSubmit(e)} className="flex flex-col gap-[11px]">
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-[13px] bg-surface border border-field rounded-[10px] text-[22px] font-mono text-ink tracking-[0.2em] text-center placeholder:text-ink-3 placeholder:tracking-[0.2em] focus:outline-none focus:border-ink transition-colors duration-150"
                />

                {error && (
                  <p className="text-[13px] text-red-500 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-[13px] bg-ink text-paper rounded-[10px] font-semibold text-[14.5px] hover:opacity-90 transition-opacity duration-150 disabled:opacity-50"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <p className="text-center text-[13px] text-ink-3 mt-6">
                Wrong email or didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-ink underline underline-offset-2 hover:text-ink-2"
                >
                  Try again
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
