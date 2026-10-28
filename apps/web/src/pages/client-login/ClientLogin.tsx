import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError('Please enter your access code.');
      return;
    }
    setError('');
    navigate(`/gallery/${trimmed}`);
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-12 animate-pfxFade">
      <div className="w-full max-w-lg">
        <p className="font-serif text-[28px] font-[600] tracking-[-0.015em] text-ink mb-8 text-center">
          Blueflutes
        </p>

        <div className="bg-surface border border-line rounded-[18px] px-9 py-9">
          <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
            Client gallery
          </h1>
          <p className="text-[14.5px] text-ink-3 text-center mb-[26px]">
            Enter the access code from your photographer.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-[11px]">
            <input
              type="text"
              value={token}
              onChange={(e) => { setToken(e.target.value); setError(''); }}
              placeholder="Access code"
              autoComplete="off"
              className="w-full px-4 py-[13px] bg-surface border border-field rounded-[10px] text-[14.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors duration-150"
            />
            {error && (
              <p className="text-[13px] text-red-500">{error}</p>
            )}
            <button
              type="submit"
              className="w-full py-[13px] bg-ink text-paper font-semibold text-[14.5px] rounded-[10px] hover:opacity-90 transition-opacity duration-150"
            >
              View gallery
            </button>
          </form>

          <p className="text-center text-[13px] text-ink-3 mt-6">
            Are you a photographer?{' '}
            <Link to="/login" className="text-ink underline underline-offset-2 hover:text-ink-2">
              Sign in to your studio →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
