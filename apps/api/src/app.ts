import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import type { Pool } from 'pg';
import { pool } from './db/client.js';
import { AppError } from './lib/app-error.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRateLimit, writeRateLimit } from './middleware/rate-limit.js';
import { requestLogging } from './middleware/request-logging.js';
import { requireAuth } from './middleware/require-auth.js';
import { resolveTenant } from './middleware/resolve-tenant.js';
import { securityHeaders } from './middleware/security-headers.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { createMediaPublicRouter, createMediaRouter } from './routes/media.js';
import { nodesRouter } from './routes/nodes.js';
import { createInProcessEnqueue } from './services/media/queue.js';
import type { Enqueue } from './services/media/queue.js';
import { createStorageProvider, type StorageProvider } from './services/storage/index.js';

/**
 * Middleware order: request logging (first, so req.id/req.log exist for
 * every later error) -> health (pre-tenant liveness, no DB/tenant required)
 * -> tenant resolution -> CORS (credentialed cross-origin allowlist for the
 * Tauri desktop shell; same-origin web requests are unaffected) -> public
 * auth routes (login/refresh/logout, which authenticate via OAuth or the
 * refresh cookie/desktop refresh header rather than a Bearer token) -> GET
 * /nodes (public, read-only portfolio data, scoped to the host-resolved
 * tenant via RLS rather than a Bearer token) -> auth (Bearer-token guard for
 * everything else) -> route groups (Milestone 1.5+) -> 404 fallback ->
 * error handler (terminal).
 *
 * `pool` is injectable so tests can point tenant resolution at the test
 * database instead of the module-level runtime pool.
 */
export function createApp(
  dbPool: Pool = pool,
  storageProvider: StorageProvider = createStorageProvider(),
  enqueue: Enqueue = createInProcessEnqueue({ pool: dbPool, storage: storageProvider }),
): Express {
  const app = express();

  // Trust exactly one proxy hop (nginx). Required so express-rate-limit
  // keys on the real client IP from X-Forwarded-For, not the proxy IP.
  // Using 1 (not true) avoids trusting arbitrary X-Forwarded-For headers
  // from clients not behind our proxy.
  app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(requestLogging);
  app.use(express.json());
  app.use(cookieParser());

  app.use(healthRouter);

  app.use(resolveTenant(dbPool));
  app.use(corsMiddleware);
  app.use('/auth', authRateLimit);
  app.use(authRouter);
  app.use(nodesRouter);
  app.use(createMediaPublicRouter());
  app.use(requireAuth);

  const mediaRouter = createMediaRouter(storageProvider, enqueue);
  app.use(writeRateLimit);
  app.use(mediaRouter);

  app.use((_req, _res, next) => {
    next(AppError.notFound('Route not found'));
  });

  app.use(errorHandler);

  return app;
}

export const app: Express = createApp();
