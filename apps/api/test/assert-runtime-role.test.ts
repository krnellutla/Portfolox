import { afterAll, describe, expect, it } from 'vitest';
import { assertRuntimeRoleSafe, assertTenantTablesRlsEnforced } from '../src/db/assert-runtime-role.js';
import { createTestPool } from './db-test-utils.js';

describe('assertRuntimeRoleSafe', () => {
  const pool = createTestPool();

  afterAll(async () => {
    await pool.end();
  });

  it('resolves without throwing for the restricted runtime role', async () => {
    await expect(assertRuntimeRoleSafe(pool)).resolves.toBeUndefined();
  });
});

describe('assertTenantTablesRlsEnforced', () => {
  const pool = createTestPool();

  afterAll(async () => {
    await pool.end();
  });

  it('resolves without throwing when all tenant-scoped tables force RLS', async () => {
    await expect(assertTenantTablesRlsEnforced(pool)).resolves.toBeUndefined();
  });
});
