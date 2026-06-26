import type { Pool } from 'pg';
import type { StorageProvider } from '../storage/index.js';
import { processAsset } from './processor.js';

export interface ProcessJob {
  tenantId: string;
  assetId: string;
}

export type Enqueue = (job: ProcessJob) => void;

export function createInProcessEnqueue(deps: { pool: Pool; storage: StorageProvider }): Enqueue {
  return (job: ProcessJob) => {
    setImmediate(() => {
      processAsset(deps, job).catch((err: unknown) => {
        console.error({ msg: 'media-processor-error', tenantId: job.tenantId, assetId: job.assetId, err });
      });
    });
  };
}
