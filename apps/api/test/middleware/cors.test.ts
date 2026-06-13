import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ALLOWED_ORIGIN = 'tauri://localhost';

describe('CORS middleware', () => {
  const tenantId = randomUUID();
  const host = `cors-${randomUUID()}.example.com`;

  let app: Express;
  let pool: Pool;
  let migratorPool: Pool;

  beforeAll(async () => {
    // Set before any module that imports `src/config/env.js` is loaded
    // (env is parsed once from process.env at module-evaluation time), so
    // every import below must be dynamic and happen after this line.
    process.env.CORS_ALLOWED_ORIGINS = ALLOWED_ORIGIN;

    const { createApp } = await import('../../src/app.js');
    const { withTenant } = await import('../../src/db/with-tenant.js');
    const { createTestMigratorPool, createTestPool } = await import('../db-test-utils.js');

    pool = createTestPool();
    migratorPool = createTestMigratorPool();
    app = createApp(pool);

    await withTenant(migratorPool, tenantId, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, 'CORS Tenant']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantId, host],
      );
    });
  });

  afterAll(async () => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
    await migratorPool.end();
  });

  it('reflects an allowlisted origin with credentials enabled', async () => {
    const res = await request(app).get('/nodes').set('Host', host).set('Origin', ALLOWED_ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not set CORS headers for a non-allowlisted origin', async () => {
    const res = await request(app).get('/nodes').set('Host', host).set('Origin', 'https://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not affect same-origin requests with no Origin header', async () => {
    const res = await request(app).get('/nodes').set('Host', host);

    expect(res.status).not.toBe(0);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers an allowlisted preflight request with allow-origin/credentials and Vary: Origin', async () => {
    const res = await request(app)
      .options('/auth/refresh')
      .set('Host', host)
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers.vary).toContain('Origin');
  });
});
