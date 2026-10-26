import 'dotenv/config';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { pool } from '../../db/client.js';
import { env } from '../../config/env.js';
import { createStorageProvider } from '../storage/index.js';
import { processAsset } from './processor.js';
import type { ProcessJob } from './queue.js';

if (!env.REDIS_URL) {
  console.error('REDIS_URL is required for the BullMQ worker');
  process.exit(1);
}

const storage = createStorageProvider();

const redisUrl = new URL(env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: redisUrl.port ? parseInt(redisUrl.port, 10) : 6379,
  password: redisUrl.password || undefined,
  username: redisUrl.username || undefined,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
};

const statusRedis = new Redis({
  ...connection,
  lazyConnect: true,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

const worker = new Worker<ProcessJob>(
  'media-processing',
  async (job) => {
    const { tenantId, assetId, nodeId } = job.data;

    await processAsset({ pool, storage }, { tenantId, assetId });

    // Invalidate gallery cache for this node
    try {
      const cacheKey = `gallery:${tenantId}:${nodeId}`;
      await statusRedis.del(cacheKey);
    } catch {
      // non-fatal
    }

    // Write a short-lived status key so the polling endpoint gets 'ready' immediately
    try {
      await statusRedis.setex(`job:status:${assetId}`, 600, 'ready');
    } catch {
      // non-fatal
    }
  },
  {
    connection,
    concurrency: 4,
  },
);

worker.on('failed', async (job, err) => {
  console.error({
    msg: 'media-worker-job-failed',
    jobId: job?.id,
    assetId: job?.data.assetId,
    err: err.message,
  });

  if (job) {
    try {
      await statusRedis.setex(`job:status:${job.data.assetId}`, 600, 'failed');
    } catch {
      // non-fatal
    }
  }
});

worker.on('ready', () => {
  console.log({ msg: 'media-worker-ready', concurrency: 4 });
});

// Graceful shutdown
async function shutdown() {
  await worker.close();
  await statusRedis.quit();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
