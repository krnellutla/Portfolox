import type { Pool } from 'pg';
import type { StorageProvider } from '../storage/index.js';
import { processAsset } from './processor.js';

export interface ProcessJob {
  tenantId: string;
  assetId: string;
  nodeId: string;
}

export type Enqueue = (job: ProcessJob) => Promise<void>;

export function createInProcessEnqueue(deps: { pool: Pool; storage: StorageProvider }): Enqueue {
  return (job: ProcessJob) => processAsset(deps, job);
}

export function createBullMQEnqueue(redisUrl: string): Enqueue {
  // Dynamically import to avoid loading bullmq when QUEUE_PROVIDER=inline
  let _queue: import('bullmq').Queue | null = null;

  async function getQueue(): Promise<import('bullmq').Queue> {
    if (_queue) return _queue;
    const { Queue } = await import('bullmq');
    const url = new URL(redisUrl);
    _queue = new Queue('media-processing', {
      connection: {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 6379,
        password: url.password || undefined,
        username: url.username || undefined,
        tls: url.protocol === 'rediss:' ? {} : undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
    return _queue;
  }

  return async (job: ProcessJob) => {
    const queue = await getQueue();
    await queue.add('process-asset', job, { jobId: job.assetId });
  };
}
