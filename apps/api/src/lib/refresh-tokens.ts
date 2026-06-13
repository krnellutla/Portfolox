import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { AppError } from './app-error.js';

export interface RefreshTokenMeta {
  userAgent?: string | null;
  ip?: string | null;
}

export interface IssuedRefreshToken {
  token: string;
  tokenId: string;
  familyId: string;
  expiresAt: Date;
}

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

function ttlToExpiry(ttlDays: number): Date {
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Issues the first refresh token of a new rotation family for a user
 * (e.g. on OAuth login). Must be called within a withTenant-scoped client.
 */
export async function createRefreshTokenFamily(
  client: PoolClient,
  params: { tenantId: string; userId: string; ttlDays: number } & RefreshTokenMeta,
): Promise<IssuedRefreshToken> {
  const token = generateToken();
  const familyId = randomUUID();
  const expiresAt = ttlToExpiry(params.ttlDays);

  const result = await client.query<{ id: string }>(
    `INSERT INTO tokens (tenant_id, user_id, family_id, hashed_token, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      params.tenantId,
      params.userId,
      familyId,
      hashRefreshToken(token),
      expiresAt,
      params.userAgent ?? null,
      params.ip ?? null,
    ],
  );

  const [insertedRow] = result.rows;
  if (!insertedRow) {
    throw new Error('createRefreshTokenFamily: insert did not return a row');
  }

  return { token, tokenId: insertedRow.id, familyId, expiresAt };
}

/**
 * Validates and rotates a refresh token: the presented token is marked as
 * rotated-to a freshly issued token in the same family. If the presented
 * token has already been rotated or revoked, this is treated as token
 * reuse — the entire family is revoked and the call rejects.
 */
export async function rotateRefreshToken(
  client: PoolClient,
  params: { tenantId: string; token: string; ttlDays: number } & RefreshTokenMeta,
): Promise<IssuedRefreshToken & { userId: string }> {
  const hashedToken = hashRefreshToken(params.token);

  const result = await client.query<{
    id: string;
    user_id: string;
    family_id: string;
    rotated_to: string | null;
    revoked_at: Date | null;
    expires_at: Date;
  }>(
    `SELECT id, user_id, family_id, rotated_to, revoked_at, expires_at
     FROM tokens WHERE tenant_id = $1 AND hashed_token = $2`,
    [params.tenantId, hashedToken],
  );

  const row = result.rows[0];
  if (!row) {
    throw AppError.unauthorized('Invalid refresh token');
  }

  if (row.revoked_at || row.rotated_to) {
    // Commit the revocation before throwing: the caller's withTenant
    // transaction will roll back on this error, which would otherwise undo
    // the family revocation we're relying on to actually block reuse.
    await revokeTokenFamily(client, params.tenantId, row.family_id);
    await client.query('COMMIT');
    throw AppError.unauthorized('Refresh token reuse detected');
  }

  if (row.expires_at.getTime() <= Date.now()) {
    throw AppError.unauthorized('Refresh token expired');
  }

  const token = generateToken();
  const expiresAt = ttlToExpiry(params.ttlDays);

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO tokens (tenant_id, user_id, family_id, hashed_token, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      params.tenantId,
      row.user_id,
      row.family_id,
      hashRefreshToken(token),
      expiresAt,
      params.userAgent ?? null,
      params.ip ?? null,
    ],
  );

  const [insertedRow] = inserted.rows;
  if (!insertedRow) {
    throw new Error('rotateRefreshToken: insert did not return a row');
  }

  await client.query('UPDATE tokens SET rotated_to = $1 WHERE id = $2', [insertedRow.id, row.id]);

  return {
    token,
    tokenId: insertedRow.id,
    familyId: row.family_id,
    expiresAt,
    userId: row.user_id,
  };
}

/** Revokes every not-yet-revoked token in a rotation family. */
export async function revokeTokenFamily(
  client: PoolClient,
  tenantId: string,
  familyId: string,
): Promise<void> {
  await client.query(
    'UPDATE tokens SET revoked_at = now() WHERE tenant_id = $1 AND family_id = $2 AND revoked_at IS NULL',
    [tenantId, familyId],
  );
}

/** Revokes the family containing the given refresh token (logout). Idempotent. */
export async function revokeRefreshToken(
  client: PoolClient,
  tenantId: string,
  token: string,
): Promise<void> {
  const result = await client.query<{ family_id: string }>(
    'SELECT family_id FROM tokens WHERE tenant_id = $1 AND hashed_token = $2',
    [tenantId, hashRefreshToken(token)],
  );

  const row = result.rows[0];
  if (!row) return;

  await revokeTokenFamily(client, tenantId, row.family_id);
}
