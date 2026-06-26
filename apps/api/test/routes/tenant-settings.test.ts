import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

describe('tenant settings API', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const app = createApp(pool);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const hostA = `ts-a-${randomUUID()}.example.com`;
  const hostB = `ts-b-${randomUUID()}.example.com`;

  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'TS Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userA, tenantA, 'tsa@example.com', 'TS A'],
      );
    });
    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'TS Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userB, tenantB, 'tsb@example.com', 'TS B'],
      );
    });

    tokenA = await signAccessToken({ sub: userA, tenantId: tenantA, email: 'tsa@example.com' });
    tokenB = await signAccessToken({ sub: userB, tenantId: tenantB, email: 'tsb@example.com' });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM tenant_settings WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM users WHERE id IN ($1, $2)', [userA, userB]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);
    await pool.end();
    await migratorPool.end();
  });

  // ── Public GET /theme ──────────────────────────────────────────────────────

  it('GET /theme returns DEFAULT_THEME when no settings row exists', async () => {
    const res = await request(app).get('/theme').set('Host', hostA);
    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toMatchObject({
      colorBg: '#f4f3f0',
      colorInk: '#16150f',
      colorAccent: '#c0683f',
      colorMuted: '#9a988f',
      fontHeading: 'newsreader',
      fontBody: 'hanken',
      galleryLayout: 'grid',
      gridColumns: 5,
    });
  });

  it('GET /theme returns 404 for an unknown host', async () => {
    const res = await request(app).get('/theme').set('Host', 'unknown.host.invalid');
    expect(res.status).toBe(404);
  });

  // ── Auth guard on PATCH ────────────────────────────────────────────────────

  it('PATCH /me/settings/theme returns 401 without a Bearer token', async () => {
    const res = await request(app)
      .patch('/me/settings/theme')
      .set('Host', hostA)
      .send({ colorBg: '#ff0000' });
    expect(res.status).toBe(401);
  });

  // ── Upsert + round-trip ───────────────────────────────────────────────────

  it('PATCH /me/settings/theme upserts and GET /theme reflects the change', async () => {
    const patch = await request(app)
      .patch('/me/settings/theme')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ colorBg: '#1a1a1a', fontHeading: 'spacemono', gridColumns: 3 });

    expect(patch.status).toBe(200);
    expect(patch.body.data).toMatchObject({
      colorBg: '#1a1a1a',
      fontHeading: 'spacemono',
      gridColumns: 3,
      // unprovided fields keep defaults
      colorInk: '#16150f',
      galleryLayout: 'grid',
    });

    const get = await request(app).get('/theme').set('Host', hostA);
    expect(get.status).toBe(200);
    expect(get.body.data.colorBg).toBe('#1a1a1a');
    expect(get.body.data.gridColumns).toBe(3);
  });

  it('subsequent PATCH only changes provided fields', async () => {
    await request(app)
      .patch('/me/settings/theme')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ colorBg: '#1a1a1a', gridColumns: 3 });

    const res = await request(app)
      .patch('/me/settings/theme')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ colorAccent: '#0000ff' });

    expect(res.status).toBe(200);
    expect(res.body.data.colorBg).toBe('#1a1a1a'); // kept
    expect(res.body.data.colorAccent).toBe('#0000ff'); // updated
  });

  // ── Zod validation ────────────────────────────────────────────────────────

  it('PATCH rejects a bad hex color', async () => {
    const res = await request(app)
      .patch('/me/settings/theme')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ colorBg: 'notahex' });
    expect(res.status).toBe(422);
  });

  it('PATCH rejects an unknown font token', async () => {
    const res = await request(app)
      .patch('/me/settings/theme')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ fontHeading: 'comic-sans' });
    expect(res.status).toBe(422);
  });

  it('PATCH rejects a bad gallery layout', async () => {
    const res = await request(app)
      .patch('/me/settings/theme')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ galleryLayout: 'carousel' });
    expect(res.status).toBe(422);
  });

  it('PATCH rejects gridColumns outside 2–6', async () => {
    const res = await request(app)
      .patch('/me/settings/theme')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ gridColumns: 10 });
    expect(res.status).toBe(422);
  });

  // ── Tenant isolation ──────────────────────────────────────────────────────

  it('tenant A settings are not visible to tenant B', async () => {
    // Ensure A has custom settings
    await request(app)
      .patch('/me/settings/theme')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ colorBg: '#aabbcc' });

    // B still sees defaults (its own row, which doesn't exist yet)
    const res = await request(app).get('/theme').set('Host', hostB);
    expect(res.status).toBe(200);
    expect(res.body.data.colorBg).not.toBe('#aabbcc');
  });

  it("token A cannot write to tenant B's settings via host spoofing", async () => {
    // Token is bound to tenantA; request goes to hostB — auth middleware
    // will 401 because the token's tenantId doesn't match the resolved tenant
    const res = await request(app)
      .patch('/me/settings/theme')
      .set('Host', hostB)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ colorBg: '#ff0000' });
    // Should fail — either 401 (auth mismatch) or the write is scoped to the
    // resolved tenant, not the token tenant. Either way B's settings unchanged.
    expect([401, 403]).toContain(res.status);
  });
});
