import { createHash, randomInt } from 'node:crypto';
import { and, desc, eq, gt, isNull, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';
import { AppError } from '../lib/app-error.js';
import * as schema from '../db/schema/index.js';

export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5;
// Max OTP requests per email per window (enforced at route level via rate limiter)
export const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;
export const OTP_REQUEST_MAX = 3;

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function createOtpCode(
  client: PoolClient,
  params: { tenantId: string; email: string; ip?: string | null },
): Promise<{ code: string; expiresAt: Date }> {
  const db = drizzle(client, { schema });

  // Invalidate any existing unused OTPs for this tenant+email before issuing a new one
  await db
    .update(schema.otpCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.otpCodes.tenantId, params.tenantId),
        eq(schema.otpCodes.email, params.email.toLowerCase()),
        isNull(schema.otpCodes.usedAt),
      ),
    );

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.insert(schema.otpCodes).values({
    tenantId: params.tenantId,
    email: params.email.toLowerCase(),
    codeHash,
    expiresAt,
    ip: params.ip ?? null,
  });

  return { code, expiresAt };
}

export async function verifyOtpCode(
  client: PoolClient,
  params: { tenantId: string; email: string; code: string },
): Promise<void> {
  const db = drizzle(client, { schema });
  const now = new Date();

  // Find the most-recent unused, unexpired OTP for this tenant+email
  const [record] = await db
    .select()
    .from(schema.otpCodes)
    .where(
      and(
        eq(schema.otpCodes.tenantId, params.tenantId),
        eq(schema.otpCodes.email, params.email.toLowerCase()),
        isNull(schema.otpCodes.usedAt),
        gt(schema.otpCodes.expiresAt, now),
      ),
    )
    .orderBy(desc(schema.otpCodes.createdAt))
    .limit(1);

  if (!record) {
    throw AppError.unauthorized('OTP is expired or invalid');
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    // Mark as used so it can't be retried
    await db
      .update(schema.otpCodes)
      .set({ usedAt: now })
      .where(eq(schema.otpCodes.id, record.id));
    throw AppError.unauthorized('Too many incorrect attempts, please request a new code');
  }

  const expectedHash = hashOtpCode(params.code);
  if (record.codeHash !== expectedHash) {
    // Increment attempt counter
    await db
      .update(schema.otpCodes)
      .set({ attempts: record.attempts + 1 })
      .where(eq(schema.otpCodes.id, record.id));
    throw AppError.unauthorized('Invalid code');
  }

  // Mark as used
  await db
    .update(schema.otpCodes)
    .set({ usedAt: now })
    .where(eq(schema.otpCodes.id, record.id));
}

/** Remove expired OTP records (called opportunistically — no hard dependency) */
export async function purgeExpiredOtpCodes(client: PoolClient): Promise<void> {
  const db = drizzle(client, { schema });
  await db
    .delete(schema.otpCodes)
    .where(lt(schema.otpCodes.expiresAt, new Date(Date.now() - OTP_TTL_MS)));
}
