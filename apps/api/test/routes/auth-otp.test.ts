import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { REFRESH_TOKEN_COOKIE } from '../../src/lib/cookies.js';
import { DESKTOP_REFRESH_TOKEN_HEADER } from '../../src/lib/desktop-auth.js';
import { hashOtpCode } from '../../src/services/otp.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

// Suppress actual email sends in tests
vi.mock('../../src/services/email.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

function cookieValue(setCookieHeader: string[] | undefined, name: string): string | undefined {
  for (const cookie of setCookieHeader ?? []) {
    const [pair] = cookie.split(';');
    const [key, value] = pair?.split('=') ?? [];
    if (key === name) return value;
  }
  return undefined;
}

async function seedOtp(
  migratorPool: ReturnType<typeof createTestMigratorPool>,
  tenantId: string,
  email: string,
  code: string,
  opts: { usedAt?: Date; expiresAt?: Date; attempts?: number } = {},
) {
  const expiresAt = opts.expiresAt ?? new Date(Date.now() + 5 * 60_000);
  const usedAt = opts.usedAt ?? null;
  const attempts = opts.attempts ?? 0;

  await withTenant(migratorPool, tenantId, async (client) => {
    await client.query(
      `INSERT INTO otp_codes (tenant_id, email, code_hash, expires_at, used_at, attempts)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, email.toLowerCase(), hashOtpCode(code), expiresAt, usedAt, attempts],
    );
  });
}

describe('POST /auth/otp/request', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const app = createApp(pool);

  const tenantId = randomUUID();
  const host = `otp-request-${randomUUID()}.example.com`;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantId, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, 'OTP Tenant']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantId, host],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM otp_codes WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
    await migratorPool.end();
  });

  it('issues an OTP for a valid email', async () => {
    const res = await request(app)
      .post('/auth/otp/request')
      .set('Host', host)
      .send({ email: 'user@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.data.expiresAt).toBeDefined();
    expect(res.body.error).toBeNull();
  });

  it('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/auth/otp/request')
      .set('Host', host)
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).not.toBeNull();
  });

  it('returns 404 for unknown host', async () => {
    const res = await request(app)
      .post('/auth/otp/request')
      .set('Host', 'unknown.example.com')
      .send({ email: 'user@example.com' });

    expect(res.status).toBe(404);
  });
});

describe('POST /auth/otp/verify', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const app = createApp(pool);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const hostA = `otp-verify-a-${randomUUID()}.example.com`;
  const hostB = `otp-verify-b-${randomUUID()}.example.com`;
  const email = 'verify@example.com';

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'Verify Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
    });

    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Verify Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM otp_codes WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM users WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tokens WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);
    await pool.end();
    await migratorPool.end();
  });

  it('issues access token + refresh cookie for a valid code', async () => {
    const code = '123456';
    await seedOtp(migratorPool, tenantA, email, code);

    const res = await request(app)
      .post('/auth/otp/verify')
      .set('Host', hostA)
      .send({ email, code });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.error).toBeNull();

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookieValue(cookies, REFRESH_TOKEN_COOKIE)).toBeDefined();
  });

  it('returns refresh token in body for desktop client', async () => {
    const code = '234567';
    await seedOtp(migratorPool, tenantA, email, code);

    const res = await request(app)
      .post('/auth/otp/verify?client=desktop')
      .set('Host', hostA)
      .send({ email, code });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();

    // No cookie should be set for desktop
    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(cookieValue(cookies, REFRESH_TOKEN_COOKIE)).toBeUndefined();
  });

  it('rejects an expired OTP', async () => {
    const code = '345678';
    await seedOtp(migratorPool, tenantA, email, code, {
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post('/auth/otp/verify')
      .set('Host', hostA)
      .send({ email, code });

    expect(res.status).toBe(401);
  });

  it('rejects an already-used OTP', async () => {
    const code = '456789';
    await seedOtp(migratorPool, tenantA, email, code, {
      usedAt: new Date(),
    });

    const res = await request(app)
      .post('/auth/otp/verify')
      .set('Host', hostA)
      .send({ email, code });

    expect(res.status).toBe(401);
  });

  it('rejects an OTP after 5 failed attempts', async () => {
    const code = '567890';
    await seedOtp(migratorPool, tenantA, email, code, { attempts: 5 });

    const res = await request(app)
      .post('/auth/otp/verify')
      .set('Host', hostA)
      .send({ email, code });

    expect(res.status).toBe(401);
  });

  it('increments attempts on a wrong code without invalidating the record', async () => {
    const realCode = '612345';
    await seedOtp(migratorPool, tenantA, email, realCode);

    const wrongRes = await request(app)
      .post('/auth/otp/verify')
      .set('Host', hostA)
      .send({ email, code: '000000' });

    expect(wrongRes.status).toBe(401);

    // Real code should still work after one wrong attempt
    const correctRes = await request(app)
      .post('/auth/otp/verify')
      .set('Host', hostA)
      .send({ email, code: realCode });

    expect(correctRes.status).toBe(200);
  });

  it('cross-tenant isolation: OTP for tenant A cannot be used against tenant B', async () => {
    const code = '789012';
    // Seed the OTP under tenant A
    await seedOtp(migratorPool, tenantA, email, code);

    // Try to verify it via tenant B's host
    const res = await request(app)
      .post('/auth/otp/verify')
      .set('Host', hostB)
      .send({ email, code });

    expect(res.status).toBe(401);
  });

  it('a single OTP cannot be used twice (single-use)', async () => {
    const code = '890123';
    await seedOtp(migratorPool, tenantA, email, code);

    const first = await request(app)
      .post('/auth/otp/verify')
      .set('Host', hostA)
      .send({ email, code });

    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/auth/otp/verify')
      .set('Host', hostA)
      .send({ email, code });

    expect(second.status).toBe(401);
  });
});
