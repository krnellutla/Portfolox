import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { REFRESH_TOKEN_COOKIE } from '../../src/lib/cookies.js';
import { DESKTOP_REFRESH_TOKEN_HEADER } from '../../src/lib/desktop-auth.js';
import { createRefreshTokenFamily } from '../../src/lib/refresh-tokens.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

function cookieValue(setCookieHeader: string[] | undefined, name: string): string | undefined {
  for (const cookie of setCookieHeader ?? []) {
    const [pair] = cookie.split(';');
    const [key, value] = pair?.split('=') ?? [];
    if (key === name) return value;
  }
  return undefined;
}

describe('POST /auth/refresh and /auth/logout', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const app = createApp(pool);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const userId = randomUUID();
  const hostA = `auth-a-${randomUUID()}.example.com`;
  const hostB = `auth-b-${randomUUID()}.example.com`;
  const email = 'auth-user@example.com';

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userId, tenantA, email, 'Auth User'],
      );
    });

    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM tokens WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM users WHERE id = $1', [userId]);
    await migratorPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);
    await pool.end();
    await migratorPool.end();
  });

  async function issueRefreshToken(): Promise<string> {
    const issued = await withTenant(pool, tenantA, (client) =>
      createRefreshTokenFamily(client, { tenantId: tenantA, userId, ttlDays: 30 }),
    );
    return issued.token;
  }

  it('rejects /auth/refresh with no refresh cookie', async () => {
    const res = await request(app).post('/auth/refresh').set('Host', hostA);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rotates the refresh token and returns an access token + user', async () => {
    const token = await issueRefreshToken();

    const res = await request(app)
      .post('/auth/refresh')
      .set('Host', hostA)
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(email);

    const newToken = cookieValue(res.headers['set-cookie'] as unknown as string[] | undefined, REFRESH_TOKEN_COOKIE);
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(token);
  });

  it('rejects reuse of an already-rotated refresh token and revokes the family', async () => {
    const token = await issueRefreshToken();

    const first = await request(app)
      .post('/auth/refresh')
      .set('Host', hostA)
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${token}`);
    expect(first.status).toBe(200);
    const rotatedToken = cookieValue(
      first.headers['set-cookie'] as unknown as string[] | undefined,
      REFRESH_TOKEN_COOKIE,
    );

    // Reuse the original token.
    const reuse = await request(app)
      .post('/auth/refresh')
      .set('Host', hostA)
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${token}`);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('UNAUTHORIZED');

    // The rotated token from the first call must also now be revoked.
    const afterReuse = await request(app)
      .post('/auth/refresh')
      .set('Host', hostA)
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${rotatedToken}`);
    expect(afterReuse.status).toBe(401);
  });

  it('rejects a refresh token issued for a different tenant', async () => {
    const token = await issueRefreshToken();

    const res = await request(app)
      .post('/auth/refresh')
      .set('Host', hostB)
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('logout revokes the refresh token family and clears the cookie', async () => {
    const token = await issueRefreshToken();

    const logout = await request(app)
      .post('/auth/logout')
      .set('Host', hostA)
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${token}`);

    expect(logout.status).toBe(200);
    expect(logout.body.data).toEqual({ success: true });

    const refreshAfterLogout = await request(app)
      .post('/auth/refresh')
      .set('Host', hostA)
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${token}`);
    expect(refreshAfterLogout.status).toBe(401);
  });

  it('logout is a no-op (200) when no refresh cookie is present', async () => {
    const res = await request(app).post('/auth/logout').set('Host', hostA);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ success: true });
  });

  describe('desktop refresh transport (X-Refresh-Token header)', () => {
    it('rotates the refresh token and returns it in the body instead of a cookie', async () => {
      const token = await issueRefreshToken();

      const res = await request(app)
        .post('/auth/refresh')
        .set('Host', hostA)
        .set(DESKTOP_REFRESH_TOKEN_HEADER, token);

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.refreshToken).toBeTruthy();
      expect(res.body.data.refreshToken).not.toBe(token);

      // No refresh cookie set for the desktop transport.
      expect(cookieValue(res.headers['set-cookie'] as unknown as string[] | undefined, REFRESH_TOKEN_COOKIE)).toBeUndefined();
    });

    it('rejects reuse of an already-rotated desktop refresh token and revokes the family', async () => {
      const token = await issueRefreshToken();

      const first = await request(app)
        .post('/auth/refresh')
        .set('Host', hostA)
        .set(DESKTOP_REFRESH_TOKEN_HEADER, token);
      expect(first.status).toBe(200);
      const rotatedToken = first.body.data.refreshToken as string;

      const reuse = await request(app)
        .post('/auth/refresh')
        .set('Host', hostA)
        .set(DESKTOP_REFRESH_TOKEN_HEADER, token);
      expect(reuse.status).toBe(401);
      expect(reuse.body.error.code).toBe('UNAUTHORIZED');

      const afterReuse = await request(app)
        .post('/auth/refresh')
        .set('Host', hostA)
        .set(DESKTOP_REFRESH_TOKEN_HEADER, rotatedToken);
      expect(afterReuse.status).toBe(401);
    });

    it('rejects a desktop refresh token issued for a different tenant', async () => {
      const token = await issueRefreshToken();

      const res = await request(app)
        .post('/auth/refresh')
        .set('Host', hostB)
        .set(DESKTOP_REFRESH_TOKEN_HEADER, token);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('logout via header revokes the desktop refresh token family', async () => {
      const token = await issueRefreshToken();

      const logout = await request(app)
        .post('/auth/logout')
        .set('Host', hostA)
        .set(DESKTOP_REFRESH_TOKEN_HEADER, token);

      expect(logout.status).toBe(200);
      expect(logout.body.data).toEqual({ success: true });

      const refreshAfterLogout = await request(app)
        .post('/auth/refresh')
        .set('Host', hostA)
        .set(DESKTOP_REFRESH_TOKEN_HEADER, token);
      expect(refreshAfterLogout.status).toBe(401);
    });

    it('expired desktop refresh tokens are rejected', async () => {
      const expired = await withTenant(pool, tenantA, (client) =>
        createRefreshTokenFamily(client, { tenantId: tenantA, userId, ttlDays: -1 }),
      );

      const res = await request(app)
        .post('/auth/refresh')
        .set('Host', hostA)
        .set(DESKTOP_REFRESH_TOKEN_HEADER, expired.token);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  it('a cookie refresh token takes precedence over a desktop header on the same request', async () => {
    const token = await issueRefreshToken();

    const res = await request(app)
      .post('/auth/refresh')
      .set('Host', hostA)
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${token}`)
      .set(DESKTOP_REFRESH_TOKEN_HEADER, 'not-a-real-token');

    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).toBeUndefined();
    expect(cookieValue(res.headers['set-cookie'] as unknown as string[] | undefined, REFRESH_TOKEN_COOKIE)).toBeTruthy();
  });
});
