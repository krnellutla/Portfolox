export const PROGRESS_TTL_MS = 10 * 60 * 1000; // 10 minutes (matches OTP TTL)

export interface LoginProgress {
  step: 'code' | 'link-sent';
  email: string;
  at: number;
}

const KEY = 'pfx:loginProgress';

export function saveProgress(step: 'code' | 'link-sent', email: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ step, email, at: Date.now() }));
  } catch {}
}

export function loadProgress(): LoginProgress | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LoginProgress;
    if (Date.now() - p.at > PROGRESS_TTL_MS) { clearProgress(); return null; }
    return p;
  } catch { return null; }
}

export function clearProgress(): void {
  try { sessionStorage.removeItem(KEY); } catch {}
}
