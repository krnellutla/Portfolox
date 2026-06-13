import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import type { Pool } from 'pg';
import { pool } from './db/client.js';
import { AppError } from './lib/app-error.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogging } from './middleware/request-logging.js';
import { requireAuth } from './middleware/require-auth.js';
import { resolveTenant } from './middleware/resolve-tenant.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';

/**
 * Middleware order: request logging (first, so req.id/req.log exist for
 * every later error) -> health (pre-tenant liveness, no DB/tenant required)
 * -> tenant resolution -> public auth routes (login/refresh/logout, which
 * authenticate via OAuth or the refresh cookie rather than a Bearer token)
 * -> auth (Bearer-token guard for everything else) -> route groups
 * (Milestone 1.5+) -> 404 fallback -> error handler (terminal).
 *
 * `pool` is injectable so tests can point tenant resolution at the test
 * database instead of the module-level runtime pool.
 */
export function createApp(dbPool: Pool = pool): Express {
  const app = express();

  app.use(requestLogging);
  app.use(express.json());
  app.use(cookieParser());

  app.use(healthRouter);

  app.use(resolveTenant(dbPool));
  app.use(authRouter);
  app.use(requireAuth);

  // Tenant-scoped, authenticated route groups (/nodes, /media, /profile)
  // mount here starting with Milestone 1.5.

  app.use((_req, _res, next) => {
    next(AppError.notFound('Route not found'));
  });

  app.use(errorHandler);

  return app;
}

export const app: Express = createApp();
