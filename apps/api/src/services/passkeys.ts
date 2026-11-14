import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import * as schema from '../db/schema/index.js';

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Challenge helpers ────────────────────────────────────────────────────────

/**
 * Persists a single-use WebAuthn challenge with a 5-minute TTL.
 *
 * @param client Tenant-scoped PostgreSQL transaction client from `withTenant`.
 * @param params Tenant ID, optional user ID (`null` for discoverable sign-in), flow type, challenge string, and client IP.
 * @returns Resolves once the challenge row is inserted.
 */
export async function createChallenge(
  client: PoolClient,
  params: {
    tenantId: string;
    userId: string | null;
    type: 'registration' | 'authentication';
    challenge: string;
    ip?: string | null;
  },
): Promise<void> {
  const db = drizzle(client, { schema });
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await db.insert(schema.webauthnChallenges).values({
    tenantId: params.tenantId,
    userId: params.userId ?? null,
    challenge: params.challenge,
    type: params.type,
    expiresAt,
    ip: params.ip ?? null,
  });
}

/**
 * Consumes the oldest unused, unexpired WebAuthn challenge matching `(tenantId, type, userId)`.
 *
 * @param client Tenant-scoped PostgreSQL transaction client from `withTenant`.
 * @param params Tenant ID, optional user ID filter, and challenge type (`registration` | `authentication`).
 * @returns The stored base64url challenge string.
 * @throws {AppError} `401 Unauthorized` when no matching active challenge exists.
 */
export async function consumeChallenge(
  client: PoolClient,
  params: { tenantId: string; userId: string | null; type: 'registration' | 'authentication' },
): Promise<string> {
  const db = drizzle(client, { schema });
  const now = new Date();

  const conditions = [
    eq(schema.webauthnChallenges.tenantId, params.tenantId),
    eq(schema.webauthnChallenges.type, params.type),
    isNull(schema.webauthnChallenges.usedAt),
    gt(schema.webauthnChallenges.expiresAt, now),
  ];

  if (params.userId) {
    conditions.push(eq(schema.webauthnChallenges.userId, params.userId));
  }

  const [row] = await db
    .select()
    .from(schema.webauthnChallenges)
    .where(and(...conditions))
    .orderBy(desc(schema.webauthnChallenges.createdAt))
    .limit(1);

  if (!row) throw AppError.unauthorized('Challenge expired or not found');

  await db
    .update(schema.webauthnChallenges)
    .set({ usedAt: now })
    .where(eq(schema.webauthnChallenges.id, row.id));

  return row.challenge;
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Generates WebAuthn registration options for an authenticated user (excluding
 * already-registered credentials) and persists a single-use challenge.
 *
 * @param client Tenant-scoped PostgreSQL transaction client from `withTenant`.
 * @param params Tenant ID, user ID, user email for RP display, and optional client IP.
 * @returns WebAuthn `PublicKeyCredentialCreationOptionsJSON` options payload.
 */
export async function beginRegistration(
  client: PoolClient,
  params: { tenantId: string; userId: string; userEmail: string; ip?: string | null },
) {
  const db = drizzle(client, { schema });

  // Collect credential IDs already registered for this user (to exclude)
  const existing = await db
    .select({ credentialId: schema.passkeyCredentials.credentialId })
    .from(schema.passkeyCredentials)
    .where(
      and(
        eq(schema.passkeyCredentials.tenantId, params.tenantId),
        eq(schema.passkeyCredentials.userId, params.userId),
      ),
    );

  const options = await generateRegistrationOptions({
    rpName: env.WEBAUTHN_RP_NAME,
    rpID: env.WEBAUTHN_RP_ID,
    userName: params.userEmail,
    userID: new TextEncoder().encode(params.userId),
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: undefined,
    })),
  });

  await createChallenge(client, {
    tenantId: params.tenantId,
    userId: params.userId,
    type: 'registration',
    challenge: options.challenge,
    ip: params.ip ?? null,
  });

  return options;
}

/**
 * Consumes the registration challenge, verifies the authenticator attestation,
 * and stores the newly registered passkey credential in `passkey_credentials`.
 *
 * @param client Tenant-scoped PostgreSQL transaction client from `withTenant`.
 * @param params Tenant ID, user ID, WebAuthn registration response JSON, and optional label.
 * @returns Newly inserted passkey credential record.
 * @throws {AppError} `401 Unauthorized` if challenge is missing/expired or attestation fails.
 * @throws {Error} If the credential insert fails to return a row.
 */
export async function finishRegistration(
  client: PoolClient,
  params: {
    tenantId: string;
    userId: string;
    response: RegistrationResponseJSON;
    friendlyName?: string | null;
  },
) {
  const db = drizzle(client, { schema });

  const expectedChallenge = await consumeChallenge(client, {
    tenantId: params.tenantId,
    userId: params.userId,
    type: 'registration',
  });

  const verification = await verifyRegistrationResponse({
    response: params.response,
    expectedChallenge,
    expectedRPID: env.WEBAUTHN_RP_ID,
    expectedOrigin: env.WEBAUTHN_ORIGINS,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw AppError.unauthorized('Registration verification failed');
  }

  const { credential, credentialDeviceType, credentialBackedUp, aaguid } =
    verification.registrationInfo;

  const credentialIdStr =
    typeof credential.id === 'string'
      ? credential.id
      : Buffer.from(credential.id).toString('base64url');
  const publicKeyHex = Buffer.from(credential.publicKey).toString('hex');
  const transports = params.response.response.transports
    ? JSON.stringify(params.response.response.transports)
    : null;

  const friendlyName =
    params.friendlyName ??
    (credentialDeviceType === 'multiDevice' ? 'Synced passkey' : 'This device');

  const [row] = await db
    .insert(schema.passkeyCredentials)
    .values({
      tenantId: params.tenantId,
      userId: params.userId,
      credentialId: credentialIdStr,
      publicKey: publicKeyHex,
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports,
      aaguid: aaguid ?? null,
      friendlyName,
    })
    .returning();

  if (!row) throw new Error('finishRegistration: insert did not return a row');
  return row;
}

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * Generates WebAuthn authentication options (scoped to `email` when provided, or
 * discoverable otherwise) and persists a single-use authentication challenge.
 *
 * @param client Tenant-scoped PostgreSQL transaction client from `withTenant`.
 * @param params Tenant ID, optional user email hint, and optional client IP.
 * @returns WebAuthn `PublicKeyCredentialRequestOptionsJSON` options payload.
 */
export async function beginAuthentication(
  client: PoolClient,
  params: { tenantId: string; email?: string | null; ip?: string | null },
) {
  const db = drizzle(client, { schema });

  let allowCredentials: { id: string }[] = [];

  if (params.email) {
    // If email provided, pre-select this user's credentials (non-discoverable flow)
    const userRow = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, params.tenantId),
          eq(schema.users.email, params.email.toLowerCase()),
        ),
      )
      .limit(1);

    if (userRow[0]) {
      const creds = await db
        .select({ credentialId: schema.passkeyCredentials.credentialId })
        .from(schema.passkeyCredentials)
        .where(
          and(
            eq(schema.passkeyCredentials.tenantId, params.tenantId),
            eq(schema.passkeyCredentials.userId, userRow[0].id),
          ),
        );
      allowCredentials = creds.map((c) => ({ id: c.credentialId }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: env.WEBAUTHN_RP_ID,
    userVerification: 'preferred',
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  await createChallenge(client, {
    tenantId: params.tenantId,
    userId: null, // Not user-specific for discoverable / email-less flow
    type: 'authentication',
    challenge: options.challenge,
    ip: params.ip ?? null,
  });

  return options;
}

/**
 * Consumes an authentication challenge, verifies the passkey assertion signature
 * and signature counter against replay attacks, and updates `counter`/`lastUsedAt`.
 *
 * @param client Tenant-scoped PostgreSQL transaction client from `withTenant`.
 * @param params Tenant ID and WebAuthn authentication response JSON.
 * @returns Object containing authenticated `userId` and database `credentialId`.
 * @throws {AppError} `401 Unauthorized` on expired challenge, unknown passkey, invalid signature, or counter replay.
 */
export async function finishAuthentication(
  client: PoolClient,
  params: {
    tenantId: string;
    response: AuthenticationResponseJSON;
  },
) {
  const db = drizzle(client, { schema });

  const expectedChallenge = await consumeChallenge(client, {
    tenantId: params.tenantId,
    userId: null,
    type: 'authentication',
  });

  // Look up the credential by ID
  const credentialIdFromResponse = params.response.id;

  const [credentialRow] = await db
    .select()
    .from(schema.passkeyCredentials)
    .where(
      and(
        eq(schema.passkeyCredentials.tenantId, params.tenantId),
        eq(schema.passkeyCredentials.credentialId, credentialIdFromResponse),
      ),
    )
    .limit(1);

  if (!credentialRow) {
    throw AppError.unauthorized('Passkey not registered on this account');
  }

  const publicKeyBytes = Buffer.from(credentialRow.publicKey, 'hex');

  const transports = credentialRow.transports
    ? (JSON.parse(credentialRow.transports) as string[])
    : undefined;

  const verification = await verifyAuthenticationResponse({
    response: params.response,
    expectedChallenge,
    expectedRPID: env.WEBAUTHN_RP_ID,
    expectedOrigin: env.WEBAUTHN_ORIGINS,
    requireUserVerification: false,
    credential: {
      id: credentialRow.credentialId,
      publicKey: publicKeyBytes,
      counter: credentialRow.counter,
      transports: transports as never,
    },
  });

  if (!verification.verified) {
    throw AppError.unauthorized('Passkey authentication failed');
  }

  const { newCounter } = verification.authenticationInfo;

  // Replay detection: if counter decreased (and counter was non-zero), reject
  if (credentialRow.counter > 0 && newCounter <= credentialRow.counter) {
    throw AppError.unauthorized('Passkey counter replay detected');
  }

  await db
    .update(schema.passkeyCredentials)
    .set({ counter: newCounter, lastUsedAt: new Date() })
    .where(eq(schema.passkeyCredentials.id, credentialRow.id));

  return { userId: credentialRow.userId, credentialId: credentialRow.id };
}

// ─── Credential management ────────────────────────────────────────────────────

/**
 * Lists non-secret metadata for all passkeys registered to `(tenantId, userId)`.
 *
 * @param client Tenant-scoped PostgreSQL transaction client from `withTenant`.
 * @param params Tenant ID and user ID.
 * @returns Array of registered passkey metadata records ordered by `createdAt`.
 */
export async function listCredentials(
  client: PoolClient,
  params: { tenantId: string; userId: string },
) {
  const db = drizzle(client, { schema });

  return db
    .select({
      id: schema.passkeyCredentials.id,
      friendlyName: schema.passkeyCredentials.friendlyName,
      deviceType: schema.passkeyCredentials.deviceType,
      backedUp: schema.passkeyCredentials.backedUp,
      transports: schema.passkeyCredentials.transports,
      aaguid: schema.passkeyCredentials.aaguid,
      lastUsedAt: schema.passkeyCredentials.lastUsedAt,
      createdAt: schema.passkeyCredentials.createdAt,
    })
    .from(schema.passkeyCredentials)
    .where(
      and(
        eq(schema.passkeyCredentials.tenantId, params.tenantId),
        eq(schema.passkeyCredentials.userId, params.userId),
      ),
    )
    .orderBy(schema.passkeyCredentials.createdAt);
}

/**
 * Renames a user's passkey credential within the active tenant.
 *
 * @param client Tenant-scoped PostgreSQL transaction client from `withTenant`.
 * @param params Tenant ID, user ID, credential UUID, and new `friendlyName`.
 * @returns Resolves when the credential is updated.
 * @throws {AppError} `404 Not Found` if no matching credential exists for the user/tenant.
 */
export async function renameCredential(
  client: PoolClient,
  params: { tenantId: string; userId: string; credentialDbId: string; friendlyName: string },
): Promise<void> {
  const db = drizzle(client, { schema });

  const result = await db
    .update(schema.passkeyCredentials)
    .set({ friendlyName: params.friendlyName })
    .where(
      and(
        eq(schema.passkeyCredentials.id, params.credentialDbId),
        eq(schema.passkeyCredentials.tenantId, params.tenantId),
        eq(schema.passkeyCredentials.userId, params.userId),
      ),
    );

  if (result.rowCount === 0) throw AppError.notFound('Passkey not found');
}

/**
 * Deletes a registered passkey credential belonging to `(tenantId, userId)`.
 *
 * @param client Tenant-scoped PostgreSQL transaction client from `withTenant`.
 * @param params Tenant ID, user ID, and credential UUID.
 * @returns Resolves when the credential is removed.
 * @throws {AppError} `404 Not Found` if no matching credential exists for the user/tenant.
 */
export async function deleteCredential(
  client: PoolClient,
  params: { tenantId: string; userId: string; credentialDbId: string },
): Promise<void> {
  const db = drizzle(client, { schema });

  const result = await db
    .delete(schema.passkeyCredentials)
    .where(
      and(
        eq(schema.passkeyCredentials.id, params.credentialDbId),
        eq(schema.passkeyCredentials.tenantId, params.tenantId),
        eq(schema.passkeyCredentials.userId, params.userId),
      ),
    );

  if (result.rowCount === 0) throw AppError.notFound('Passkey not found');
}
