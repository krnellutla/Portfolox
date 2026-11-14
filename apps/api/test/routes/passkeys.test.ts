import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

// Mock the WebAuthn library so begin/finish can be tested without a real browser
vi.mock('@simplewebauthn/server', async () => {
  const actual = await vi.importActual<typeof import('@simplewebauthn/server')>('@simplewebauthn/server');
  return {
    ...actual,
    generateRegistrationOptions: vi.fn().mockResolvedValue({
      challenge: 'mock-challenge-registration',
      rp: { name: 'Blueflutes', id: 'localhost' },
      user: { id: 'dXNlcg==', name: 'user@example.com', displayName: 'user@example.com' },
      pubKeyCredParams: [],
      timeout: 60000,
      excludeCredentials: [],
      attestation: 'none',
    }),
    generateAuthenticationOptions: vi.fn().mockResolvedValue({
      challenge: 'mock-challenge-authentication',
      rpId: 'localhost',
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: [],
    }),
    verifyRegistrationResponse: vi.fn().mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: Buffer.from('credential-id'),
          publicKey: Buffer.from('public-key-bytes'),
          counter: 0,
        },
        credentialDeviceType: 'multiDevice',
        credentialBackedUp: true,
        aaguid: 'test-aaguid',
      },
    }),
    verifyAuthenticationResponse: vi.fn().mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    }),
  };
});

describe('Passkey routes — management (list / rename / delete)', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const app = createApp(pool);

  const tenantId = randomUUID();
  const userId = randomUUID();
  const host = `pk-mgmt-${randomUUID()}.example.com`;
  let accessToken: string;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantId, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, 'PK Tenant']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantId, host],
      );
      await client.query(
        `INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)`,
        [userId, tenantId, 'pkuser@example.com', 'PK User'],
      );
    });
    accessToken = await signAccessToken({ sub: userId, tenantId, email: 'pkuser@example.com' });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM passkey_credentials WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM webauthn_challenges WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM users WHERE id = $1', [userId]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
    await migratorPool.end();
  });

  it('GET /auth/passkey/credentials — returns empty list initially', async () => {
    const res = await request(app)
      .get('/auth/passkey/credentials')
      .set('Host', host)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.credentials).toEqual([]);
    expect(res.body.error).toBeNull();
  });

  it('GET /auth/passkey/credentials — requires auth', async () => {
    const res = await request(app)
      .get('/auth/passkey/credentials')
      .set('Host', host);

    expect(res.status).toBe(401);
  });

  let credentialDbId: string;

  it('POST /auth/passkey/register/begin — returns WebAuthn options', async () => {
    const res = await request(app)
      .post('/auth/passkey/register/begin')
      .set('Host', host)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.challenge).toBe('mock-challenge-registration');
    expect(res.body.error).toBeNull();
  });

  it('POST /auth/passkey/register/finish — stores credential', async () => {
    // Insert a challenge row directly so finish can consume it
    await migratorPool.query(
      `INSERT INTO webauthn_challenges (tenant_id, user_id, challenge, type, expires_at)
       VALUES ($1, $2, $3, 'registration', NOW() + INTERVAL '5 minutes')`,
      [tenantId, userId, 'mock-challenge-registration'],
    );

    const res = await request(app)
      .post('/auth/passkey/register/finish')
      .set('Host', host)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        response: {
          id: Buffer.from('credential-id').toString('base64url'),
          rawId: Buffer.from('credential-id').toString('base64url'),
          response: {
            attestationObject: 'test',
            clientDataJSON: 'test',
            transports: ['internal'],
          },
          type: 'public-key',
          clientExtensionResults: {},
        },
        friendlyName: 'Test device',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      friendlyName: 'Test device',
      backedUp: true,
    });
    credentialDbId = res.body.data.id as string;
  });

  it('GET /auth/passkey/credentials — lists the stored credential', async () => {
    const res = await request(app)
      .get('/auth/passkey/credentials')
      .set('Host', host)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.credentials).toHaveLength(1);
    expect(res.body.data.credentials[0].friendlyName).toBe('Test device');
  });

  it('PATCH /auth/passkey/credentials/:id — renames the credential', async () => {
    const res = await request(app)
      .patch(`/auth/passkey/credentials/${credentialDbId}`)
      .set('Host', host)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ friendlyName: 'My iPhone 15' });

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);

    // Verify the name changed
    const listRes = await request(app)
      .get('/auth/passkey/credentials')
      .set('Host', host)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listRes.body.data.credentials[0].friendlyName).toBe('My iPhone 15');
  });

  it('PATCH /auth/passkey/credentials/:id — rejects empty friendlyName', async () => {
    const res = await request(app)
      .patch(`/auth/passkey/credentials/${credentialDbId}`)
      .set('Host', host)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ friendlyName: '' });

    expect(res.status).toBe(400);
  });

  it('PATCH /auth/passkey/credentials/:id — 404 for another tenants credential', async () => {
    const otherTenantId = randomUUID();
    const otherHost = `pk-other-${randomUUID()}.example.com`;

    await withTenant(migratorPool, otherTenantId, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [otherTenantId, 'Other']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [otherTenantId, otherHost],
      );
      const otherUserId = randomUUID();
      await client.query(
        `INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)`,
        [otherUserId, otherTenantId, 'other@example.com', 'Other User'],
      );
      const otherToken = await signAccessToken({ sub: otherUserId, tenantId: otherTenantId, email: 'other@example.com' });

      const res = await request(app)
        .patch(`/auth/passkey/credentials/${credentialDbId}`)
        .set('Host', otherHost)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ friendlyName: 'Stolen' });

      expect(res.status).toBe(404);
    });

    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id = $1', [otherTenantId]);
    await migratorPool.query('DELETE FROM users WHERE tenant_id = $1', [otherTenantId]);
    await migratorPool.query('DELETE FROM tenants WHERE id = $1', [otherTenantId]);
  });

  it('DELETE /auth/passkey/credentials/:id — removes the credential', async () => {
    const res = await request(app)
      .delete(`/auth/passkey/credentials/${credentialDbId}`)
      .set('Host', host)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);

    const listRes = await request(app)
      .get('/auth/passkey/credentials')
      .set('Host', host)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listRes.body.data.credentials).toHaveLength(0);
  });

  it('DELETE /auth/passkey/credentials/:id — 404 when already deleted', async () => {
    const res = await request(app)
      .delete(`/auth/passkey/credentials/${randomUUID()}`)
      .set('Host', host)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Passkey auth — begin (public endpoint)', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const app = createApp(pool);

  const tenantId = randomUUID();
  const host = `pk-auth-${randomUUID()}.example.com`;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantId, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, 'PK Auth Tenant']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantId, host],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM webauthn_challenges WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
    await migratorPool.end();
  });

  it('POST /auth/passkey/auth/begin — returns WebAuthn options (discoverable flow)', async () => {
    const res = await request(app)
      .post('/auth/passkey/auth/begin')
      .set('Host', host)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.challenge).toBe('mock-challenge-authentication');
    expect(res.body.error).toBeNull();
  });

  it('POST /auth/passkey/auth/begin — unknown host returns 404', async () => {
    const res = await request(app)
      .post('/auth/passkey/auth/begin')
      .set('Host', 'nope.example.com')
      .send({});

    expect(res.status).toBe(404);
  });
});
