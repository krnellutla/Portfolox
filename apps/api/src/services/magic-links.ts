import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';
import { AppError } from '../lib/app-error.js';
import * as schema from '../db/schema/index.js';

export const MAGIC_LINK_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function generateMagicToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashMagicToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createMagicLink(
  client: PoolClient,
  params: { tenantId: string; email: string; ip?: string | null },
): Promise<{ token: string; expiresAt: Date }> {
  const db = drizzle(client, { schema });

  // Invalidate any existing unused magic links for this tenant+email
  await db
    .update(schema.magicLinks)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.magicLinks.tenantId, params.tenantId),
        eq(schema.magicLinks.email, params.email.toLowerCase()),
        isNull(schema.magicLinks.usedAt),
      ),
    );

  const token = generateMagicToken();
  const tokenHash = hashMagicToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await db.insert(schema.magicLinks).values({
    tenantId: params.tenantId,
    email: params.email.toLowerCase(),
    tokenHash,
    expiresAt,
    ip: params.ip ?? null,
  });

  return { token, expiresAt };
}

export async function verifyMagicLink(
  client: PoolClient,
  params: { tenantId: string; token: string },
): Promise<{ email: string }> {
  const db = drizzle(client, { schema });
  const now = new Date();
  const tokenHash = hashMagicToken(params.token);

  const [record] = await db
    .select()
    .from(schema.magicLinks)
    .where(
      and(
        eq(schema.magicLinks.tokenHash, tokenHash),
        eq(schema.magicLinks.tenantId, params.tenantId),
        isNull(schema.magicLinks.usedAt),
        gt(schema.magicLinks.expiresAt, now),
      ),
    )
    .limit(1);

  if (!record) {
    throw AppError.unauthorized('Magic link is expired or already used');
  }

  await db
    .update(schema.magicLinks)
    .set({ usedAt: now })
    .where(eq(schema.magicLinks.id, record.id));

  return { email: record.email };
}
