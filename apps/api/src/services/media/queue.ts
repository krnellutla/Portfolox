import type { Pool } from 'pg';
import type { StorageProvider } from '../storage/index.js';
import { processAsset } from './processor.js';

export interface ProcessJob {
  tenantId: string;
  assetId: string;
}

export type Enqueue = (job: ProcessJob) => Promise<void>;

export function createInProcessEnqueue(deps: { pool: Pool; storage: StorageProvider }): Enqueue {
  return (job: ProcessJob) => processAsset(deps, job);
}
