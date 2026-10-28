import type { ApiEnvelope } from '@blueflutes/shared';
import { Router } from 'express';
import { env } from '../config/env.js';
import { getCacheStats } from '../services/cache/gallery-cache.js';

export const healthRouter: Router = Router();

healthRouter.get('/health', (_req, res) => {
  const body: ApiEnvelope<{ status: 'ok' }> = {
    data: { status: 'ok' },
    error: null,
  };
  res.json(body);
});

// Authenticated queue/cache health — registered after requireAuth in app.ts
export const queueHealthRouter: Router = Router();

queueHealthRouter.get('/health/queue', async (_req, res, next) => {
  try {
    // Queue depth via BullMQ (only when configured)
    type QueueCounts = { waiting: number; active: number; failed: number } | null;
    let queue: QueueCounts = null;

    if (env.QUEUE_PROVIDER === 'bullmq' && env.REDIS_URL) {
      try {
        const { Queue } = await import('bullmq');
        const url = new URL(env.REDIS_URL);
        const q = new Queue('media-processing', {
          connection: {
            host: url.hostname,
            port: url.port ? parseInt(url.port, 10) : 6379,
            password: url.password || undefined,
            username: url.username || undefined,
            tls: url.protocol === 'rediss:' ? {} : undefined,
          },
        });
        const counts = await q.getJobCounts('waiting', 'active', 'failed');
        queue = {
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          failed: counts.failed ?? 0,
        };
        await q.close();
      } catch {
        // queue unavailable — leave null
      }
    }

    // Redis ping
    let redisPingMs: number | null = null;
    if (env.REDIS_URL) {
      try {
        const { Redis } = await import('ioredis');
        const r = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, enableReadyCheck: false, lazyConnect: false });
        const start = Date.now();
        await r.ping();
        redisPingMs = Date.now() - start;
        r.disconnect();
      } catch {
        // Redis unreachable — leave null
      }
    }

    // Cache hit rate
    const stats = await getCacheStats();
    const cacheHitRate =
      stats && stats.hits + stats.misses > 0
        ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
        : null;

    type QueueHealth = {
      queue: QueueCounts;
      redis: { pingMs: number | null };
      cache: { hits: number | null; misses: number | null; hitRatePct: number | null };
    };

    const body: ApiEnvelope<QueueHealth> = {
      data: {
        queue,
        redis: { pingMs: redisPingMs },
        cache: {
          hits: stats?.hits ?? null,
          misses: stats?.misses ?? null,
          hitRatePct: cacheHitRate,
        },
      },
      error: null,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
