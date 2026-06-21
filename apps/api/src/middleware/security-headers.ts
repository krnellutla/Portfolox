import helmet from 'helmet';
import { env } from '../config/env.js';

const isProd = env.NODE_ENV === 'production';

/**
 * Helmet security headers. CSP allows:
 *   - same-origin scripts/styles/connects
 *   - Tauri desktop shell origins (tauri://localhost, http://tauri.localhost)
 *   - Google Fonts for the web UI
 * HSTS is production-only (dev runs on plain HTTP).
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'tauri://localhost',
        'http://tauri.localhost',
        'https://tauri.localhost',
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
