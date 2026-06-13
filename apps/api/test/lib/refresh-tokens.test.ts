import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTenant } from '../../src/db/with-tenant.js';
import { AppError } from '../../src/lib/app-error.js';
import {
  createRefreshTokenFamily,
  hashRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} from '../../src/lib/refresh-tokens.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

describe('refresh token rotation and reuse detection', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();

  const tenantId = randomUUID();
  const userId = randomUUID();

  beforeAll(async () => {
    await withTenant(migratorPool, tenantId, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, 'Tenant A']);
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userId, tenantId, 'user@example.com', 'Test User'],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM tokens WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM users WHERE id = $1', [userId]);
    await migratorPool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
    await migratorPool.end();
  });

  it('creates a token family with a hashable token and future expiry', async () => {
    const issued = await withTenant(pool, tenantId, (client) =>
      createRefreshTokenFamily(client, { tenantId, userId, ttlDays: 30 }),
    );

    expect(issued.token).toBeTruthy();
    expect(issued.familyId).toBeTruthy();
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const row = await withTenant(pool, tenantId, (client) =>
      client.query('SELECT hashed_token, family_id FROM tokens WHERE id = $1', [issued.tokenId]),
    );
    expect(row.rows[0].hashed_token).toBe(hashRefreshToken(issued.token));
    expect(row.rows[0].family_id).toBe(issued.familyId);
  });

  it('rotates a valid refresh token, issuing a new token in the same family', async () => {
    const issued = await withTenant(pool, tenantId, (client) =>
      createRefreshTokenFamily(client, { tenantId, userId, ttlDays: 30 }),
    );

    const rotated = await withTenant(pool, tenantId, (client) =>
      rotateRefreshToken(client, { tenantId, token: issued.token, ttlDays: 30 }),
    );

    expect(rotated.token).not.toBe(issued.token);
    expect(rotated.familyId).toBe(issued.familyId);
    expect(rotated.userId).toBe(userId);

    const oldRow = await withTenant(pool, tenantId, (client) =>
      client.query('SELECT rotated_to FROM tokens WHERE id = $1', [issued.tokenId]),
    );
    expect(oldRow.rows[0].rotated_to).toBe(rotated.tokenId);
  });

  it('rejects reuse of an already-rotated token and revokes the whole family', async () => {
    const issued = await withTenant(pool, tenantId, (client) =>
      createRefreshTokenFamily(client, { tenantId, userId, ttlDays: 30 }),
    );

    const rotated = await withTenant(pool, tenantId, (client) =>
      rotateRefreshToken(client, { tenantId, token: issued.token, ttlDays: 30 }),
    );

    // Reuse the original (already-rotated) token.
    await expect(
      withTenant(pool, tenantId, (client) =>
        rotateRefreshToken(client, { tenantId, token: issued.token, ttlDays: 30 }),
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    // The whole family — including the token that was just rotated to —
    // must now be revoked.
    const rows = await withTenant(pool, tenantId, (client) =>
      client.query('SELECT id, revoked_at FROM tokens WHERE family_id = $1', [issued.familyId]),
    );
    expect(rows.rows).toHaveLength(2);
    for (const row of rows.rows) {
      expect(row.revoked_at).not.toBeNull();
    }

    // The rotated (now-revoked) token can no longer be used either.
    await expect(
      withTenant(pool, tenantId, (client) =>
        rotateRefreshToken(client, { tenantId, token: rotated.token, ttlDays: 30 }),
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects an expired refresh token', async () => {
    const issued = await withTenant(pool, tenantId, (client) =>
      createRefreshTokenFamily(client, { tenantId, userId, ttlDays: 30 }),
    );

    await withTenant(pool, tenantId, (client) =>
      client.query("UPDATE tokens SET expires_at = now() - interval '1 day' WHERE id = $1", [
        issued.tokenId,
      ]),
    );

    await expect(
      withTenant(pool, tenantId, (client) =>
        rotateRefreshToken(client, { tenantId, token: issued.token, ttlDays: 30 }),
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects an unknown token', async () => {
    await expect(
      withTenant(pool, tenantId, (client) =>
        rotateRefreshToken(client, { tenantId, token: 'not-a-real-token', ttlDays: 30 }),
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('revokeRefreshToken invalidates the whole family (logout)', async () => {
    const issued = await withTenant(pool, tenantId, (client) =>
      createRefreshTokenFamily(client, { tenantId, userId, ttlDays: 30 }),
    );

    await withTenant(pool, tenantId, (client) => revokeRefreshToken(client, tenantId, issued.token));

    await expect(
      withTenant(pool, tenantId, (client) =>
        rotateRefreshToken(client, { tenantId, token: issued.token, ttlDays: 30 }),
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('revokeRefreshToken is idempotent for unknown tokens', async () => {
    await expect(
      withTenant(pool, tenantId, (client) => revokeRefreshToken(client, tenantId, 'no-such-token')),
    ).resolves.toBeUndefined();
  });
});
