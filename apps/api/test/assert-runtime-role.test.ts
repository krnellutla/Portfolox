import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertRuntimeRoleSafe, assertTenantTablesRlsEnforced } from '../src/db/assert-runtime-role.js';
import { createTestPool } from './db-test-utils.js';

describe('assertRuntimeRoleSafe', () => {
  const pool = createTestPool();
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
    } catch {
      // DB not reachable in this environment — tests are skipped below
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('resolves without throwing for the restricted runtime role', async () => {
    if (!dbAvailable) return;
    await expect(assertRuntimeRoleSafe(pool)).resolves.toBeUndefined();
  });
});

describe('assertTenantTablesRlsEnforced', () => {
  const pool = createTestPool();
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
    } catch {
      // DB not reachable in this environment — tests are skipped below
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('resolves without throwing when all tenant-scoped tables force RLS', async () => {
    if (!dbAvailable) return;
    await expect(assertTenantTablesRlsEnforced(pool)).resolves.toBeUndefined();
  });
});
