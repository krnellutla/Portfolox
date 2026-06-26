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
import { createNodesWriteRouter } from './routes/nodes-write.js';
import { discoverRouter } from './routes/discover.js';
import { photographersRouter } from './routes/photographers.js';
import { photosRouter } from './routes/photos.js';
import { searchRouter } from './routes/search-route.js';
import { plansRouter } from './routes/plans.js';
import { communityRouter } from './routes/community.js';
import { conversationsRouter } from './routes/conversations.js';
import { clientGalleryRouter } from './routes/client-gallery.js';
import { meRouter } from './routes/me.js';
import { galleriesRouter } from './routes/galleries.js';
import { analyticsRouter } from './routes/analytics.js';
import { tenantSettingsPublicRouter, tenantSettingsRouter } from './routes/tenant-settings.js';
import { createInProcessEnqueue } from './services/media/queue.js';
import type { Enqueue } from './services/media/queue.js';
import { createStorageProvider, type StorageProvider } from './services/storage/index.js';

/**
 * Middleware order: request logging -> health -> tenant resolution -> CORS
 * -> auth rate-limit -> auth routes -> public read routes (nodes, media,
 * discover, photographers, photos, search, plans, community, conversations,
 * client gallery) -> requireAuth guard -> protected write routes.
 */
export function createApp(
  dbPool: Pool = pool,
  storageProvider: StorageProvider = createStorageProvider(),
  enqueue: Enqueue = createInProcessEnqueue({ pool: dbPool, storage: storageProvider }),
): Express {
  const app = express();

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

  // Public read routes — no Bearer token required
  app.use(nodesRouter);
  app.use(createMediaPublicRouter());
  app.use(discoverRouter);
  app.use(photographersRouter);
  app.use(photosRouter);
  app.use(searchRouter);
  app.use(plansRouter);
  app.use(communityRouter);
  app.use(conversationsRouter);
  app.use(clientGalleryRouter);
  app.use(tenantSettingsPublicRouter);

  // Protected routes — Bearer token required
  app.use(requireAuth);
  app.use(writeRateLimit);

  const mediaRouter = createMediaRouter(storageProvider, enqueue);
  app.use(mediaRouter);
  app.use(createNodesWriteRouter());
  app.use(meRouter);
  app.use(tenantSettingsRouter);
  app.use(galleriesRouter);
  app.use(analyticsRouter);

  app.use((_req, _res, next) => {
    next(AppError.notFound('Route not found'));
  });

  app.use(errorHandler);

  return app;
}

export const app: Express = createApp();
