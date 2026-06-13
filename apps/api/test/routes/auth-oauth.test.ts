import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { REFRESH_TOKEN_COOKIE } from '../../src/lib/cookies.js';
import { OAUTH_STATE_COOKIE } from '../../src/lib/oauth-state.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

function cookieValue(setCookieHeader: string[] | undefined, name: string): string | undefined {
  for (const cookie of setCookieHeader ?? []) {
    const [pair] = cookie.split(';');
    const [key, value] = pair?.split('=') ?? [];
    if (key === name) return value;
  }
  return undefined;
}

function setCookies(res: request.Response): string[] | undefined {
  return res.headers['set-cookie'] as unknown as string[] | undefined;
}

function decodeStateCookie(value: string): { provider: string; state: string; codeVerifier?: string } {
  return JSON.parse(decodeURIComponent(value)) as { provider: string; state: string; codeVerifier?: string };
}

describe('GET /auth/:provider and /auth/:provider/callback', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const app = createApp(pool);

  const tenantId = randomUUID();
  const host = `auth-oauth-${randomUUID()}.example.com`;

  let mockAgent: MockAgent;
  let originalDispatcher: ReturnType<typeof getGlobalDispatcher>;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantId, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, 'OAuth Tenant']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantId, host],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM tokens WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
    await migratorPool.end();
  });

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(() => {
    setGlobalDispatcher(originalDispatcher);
  });

  it('redirects to the Google authorization URL and sets an oauth_state cookie with a PKCE verifier', async () => {
    const res = await request(app).get('/auth/google').set('Host', host);

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location as string);
    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.searchParams.get('state')).toBeTruthy();
    expect(location.searchParams.get('code_challenge')).toBeTruthy();

    const stateCookie = cookieValue(setCookies(res), OAUTH_STATE_COOKIE);
    expect(stateCookie).toBeTruthy();
    const decoded = decodeStateCookie(stateCookie as string);
    expect(decoded.provider).toBe('google');
    expect(decoded.state).toBe(location.searchParams.get('state'));
    expect(decoded.codeVerifier).toBeTruthy();
  });

  it('redirects to the GitHub authorization URL and sets an oauth_state cookie', async () => {
    const res = await request(app).get('/auth/github').set('Host', host);

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location as string);
    expect(location.origin).toBe('https://github.com');
    expect(location.searchParams.get('state')).toBeTruthy();

    const stateCookie = cookieValue(setCookies(res), OAUTH_STATE_COOKIE);
    expect(stateCookie).toBeTruthy();
    const decoded = decodeStateCookie(stateCookie as string);
    expect(decoded.provider).toBe('github');
    expect(decoded.codeVerifier).toBeUndefined();
  });

  it('rejects /auth/google/callback with no oauth_state cookie', async () => {
    const res = await request(app).get('/auth/google/callback?code=abc&state=xyz').set('Host', host);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects /auth/google/callback when the state does not match the cookie', async () => {
    const start = await request(app).get('/auth/google').set('Host', host);
    const stateCookie = cookieValue(setCookies(start), OAUTH_STATE_COOKIE) as string;

    const res = await request(app)
      .get('/auth/google/callback?code=abc&state=wrong-state')
      .set('Host', host)
      .set('Cookie', `${OAUTH_STATE_COOKIE}=${stateCookie}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('completes the Google OAuth round trip: exchanges the code, upserts the user, and issues a refresh cookie', async () => {
    const start = await request(app).get('/auth/google').set('Host', host);
    const stateCookie = cookieValue(setCookies(start), OAUTH_STATE_COOKIE) as string;
    const decoded = decodeStateCookie(stateCookie);

    mockAgent
      .get('https://oauth2.googleapis.com')
      .intercept({ path: '/token', method: 'POST' })
      .reply(200, { access_token: 'google-access-token', token_type: 'Bearer', expires_in: 3600 });

    mockAgent
      .get('https://openidconnect.googleapis.com')
      .intercept({ path: '/v1/userinfo', method: 'GET' })
      .reply(200, {
        email: 'oauth-google@example.com',
        email_verified: true,
        name: 'Google User',
        picture: 'https://example.com/g.png',
      });

    const res = await request(app)
      .get(`/auth/google/callback?code=test-code&state=${decoded.state}`)
      .set('Host', host)
      .set('Cookie', `${OAUTH_STATE_COOKIE}=${stateCookie}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173');

    const refreshCookie = cookieValue(setCookies(res), REFRESH_TOKEN_COOKIE);
    expect(refreshCookie).toBeTruthy();

    const clearedState = setCookies(res)?.find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`));
    expect(clearedState).toMatch(/Expires=Thu, 01 Jan 1970/);

    const userResult = await withTenant(migratorPool, tenantId, (client) =>
      client.query('SELECT email, display_name, avatar_url FROM users WHERE tenant_id = $1', [tenantId]),
    );
    expect(userResult.rows).toHaveLength(1);
    expect(userResult.rows[0]).toMatchObject({
      email: 'oauth-google@example.com',
      display_name: 'Google User',
      avatar_url: 'https://example.com/g.png',
    });
  });

  it('rejects a Google callback when the account email is unverified', async () => {
    const start = await request(app).get('/auth/google').set('Host', host);
    const stateCookie = cookieValue(setCookies(start), OAUTH_STATE_COOKIE) as string;
    const decoded = decodeStateCookie(stateCookie);

    mockAgent
      .get('https://oauth2.googleapis.com')
      .intercept({ path: '/token', method: 'POST' })
      .reply(200, { access_token: 'google-access-token', token_type: 'Bearer', expires_in: 3600 });

    mockAgent
      .get('https://openidconnect.googleapis.com')
      .intercept({ path: '/v1/userinfo', method: 'GET' })
      .reply(200, {
        email: 'unverified@example.com',
        email_verified: false,
        name: 'Unverified User',
      });

    const res = await request(app)
      .get(`/auth/google/callback?code=test-code&state=${decoded.state}`)
      .set('Host', host)
      .set('Cookie', `${OAUTH_STATE_COOKIE}=${stateCookie}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');

    const userResult = await withTenant(migratorPool, tenantId, (client) =>
      client.query('SELECT 1 FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, 'unverified@example.com']),
    );
    expect(userResult.rows).toHaveLength(0);
  });

  it('completes the GitHub OAuth round trip and upserts (not duplicates) the existing user by email', async () => {
    const start = await request(app).get('/auth/github').set('Host', host);
    const stateCookie = cookieValue(setCookies(start), OAUTH_STATE_COOKIE) as string;
    const decoded = decodeStateCookie(stateCookie);

    mockAgent
      .get('https://github.com')
      .intercept({ path: '/login/oauth/access_token', method: 'POST' })
      .reply(200, { access_token: 'github-access-token', token_type: 'bearer', scope: 'read:user,user:email' });

    mockAgent
      .get('https://api.github.com')
      .intercept({ path: '/user', method: 'GET' })
      .reply(200, {
        login: 'octouser',
        name: null,
        avatar_url: 'https://example.com/gh.png',
        email: null,
      });

    mockAgent
      .get('https://api.github.com')
      .intercept({ path: '/user/emails', method: 'GET' })
      .reply(200, [
        { email: 'secondary@example.com', primary: false, verified: true },
        { email: 'oauth-google@example.com', primary: true, verified: true },
      ]);

    const res = await request(app)
      .get(`/auth/github/callback?code=test-code&state=${decoded.state}`)
      .set('Host', host)
      .set('Cookie', `${OAUTH_STATE_COOKIE}=${stateCookie}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173');

    const refreshCookie = cookieValue(setCookies(res), REFRESH_TOKEN_COOKIE);
    expect(refreshCookie).toBeTruthy();

    // Same email as the Google round trip above: must update the existing
    // user row (display name/avatar from GitHub) rather than create a second one.
    const userResult = await withTenant(migratorPool, tenantId, (client) =>
      client.query('SELECT email, display_name, avatar_url FROM users WHERE tenant_id = $1', [tenantId]),
    );
    expect(userResult.rows).toHaveLength(1);
    expect(userResult.rows[0]).toMatchObject({
      email: 'oauth-google@example.com',
      display_name: 'octouser',
      avatar_url: 'https://example.com/gh.png',
    });
  });
});
