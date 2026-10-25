import helmet from 'helmet';
import { env } from '../config/env.js';

const isProd = env.NODE_ENV === 'production';

// Extract storage origin once at startup so CSP allows production image loads.
// When STORAGE_PUBLIC_BASE_URL is unset (e.g. fake/local storage), no extra
// origin is added and the directive stays same-origin only.
const storageOrigin: string | null = (() => {
  if (!env.STORAGE_PUBLIC_BASE_URL) return null;
  try { return new URL(env.STORAGE_PUBLIC_BASE_URL).origin; }
  catch { return null; }
})();

/**
 * Helmet security headers. CSP allows:
 *   - same-origin scripts/styles/connects
 *   - Tauri desktop shell origins (tauri://localhost, http://tauri.localhost)
 *   - Google Fonts for the web UI
 *   - Cloud storage origin for media images (when STORAGE_PUBLIC_BASE_URL is set)
 * HSTS is production-only (dev runs on plain HTTP).
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', ...(storageOrigin ? [storageOrigin] : [])],
      fontSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'tauri://localhost',
        'http://tauri.localhost',
        'https://tauri.localhost',
        ...(storageOrigin ? [storageOrigin] : []),
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: isProd
    ? { maxAge: 63_072_000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
