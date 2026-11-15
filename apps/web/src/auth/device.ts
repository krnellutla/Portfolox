const PASSKEY_KEY = 'pfx:hasPasskey';
const SIGNED_OUT_KEY = 'pfx:signedOut';

export function deviceHasPasskey(): boolean {
  try { return localStorage.getItem(PASSKEY_KEY) === '1'; } catch { return false; }
}

export function markDevicePasskey(has: boolean): void {
  try {
    if (has) localStorage.setItem(PASSKEY_KEY, '1');
    else localStorage.removeItem(PASSKEY_KEY);
  } catch {}
}

export function noteSignedOut(val: boolean): void {
  try {
    if (val) sessionStorage.setItem(SIGNED_OUT_KEY, '1');
    else sessionStorage.removeItem(SIGNED_OUT_KEY);
  } catch {}
}

export function signedOutHere(): boolean {
  try { return sessionStorage.getItem(SIGNED_OUT_KEY) === '1'; } catch { return false; }
}

export function shouldAutoPasskey(opts: {
  supported: boolean;
  deviceHas: boolean;
  onStartStep: boolean;
  signedOutHere: boolean;
  alreadyTried: boolean;
}): boolean {
  return opts.supported && opts.deviceHas && opts.onStartStep && !opts.signedOutHere && !opts.alreadyTried;
}

export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window;
}
