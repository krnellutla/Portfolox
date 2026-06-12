import { Pool } from 'pg';
import { env } from '../src/config/env.js';

export function createTestPool(): Pool {
  if (!env.DATABASE_TEST_URL) {
    throw new Error('DATABASE_TEST_URL must be set to run the RLS isolation tests');
  }

  return new Pool({ connectionString: env.DATABASE_TEST_URL, max: 5 });
}

export function createTestMigratorPool(): Pool {
  if (!env.DATABASE_TEST_MIGRATION_URL) {
    throw new Error('DATABASE_TEST_MIGRATION_URL must be set to run the RLS isolation tests');
  }

  return new Pool({ connectionString: env.DATABASE_TEST_MIGRATION_URL, max: 5 });
}
