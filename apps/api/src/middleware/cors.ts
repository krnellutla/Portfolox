import cors from 'cors';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

/**
 * Credentialed CORS for the Tauri desktop shell only. The web app talks to
 * the API same-origin (Vite dev proxy / same-origin prod serving) and never
 * hits this allowlist. Origins come from CORS_ALLOWED_ORIGINS (12-factor);
 * an empty allowlist (the default) rejects all cross-origin requests —
 * same-origin requests are never subject to CORS regardless.
 */
export const corsMiddleware: RequestHandler = cors({
  origin(origin, callback) {
    if (!origin) {
      // Same-origin / non-browser request: no Origin header to reflect, so
      // no CORS headers are needed either way.
      callback(null, false);
      return;
    }
    if (env.CORS_ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
});
