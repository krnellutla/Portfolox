import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';
import * as schema from '../db/schema/index.js';

export async function findUserById(client: PoolClient, userId: string) {
  const db = drizzle(client, { schema });
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  return user;
}

/**
 * Creates the tenant-scoped user for an OAuth profile, or updates the
 * display name/avatar of an existing one matched by (tenantId, email).
 */
export async function upsertUserByEmail(
  client: PoolClient,
  params: { tenantId: string; email: string; displayName: string; avatarUrl: string | null },
) {
  const db = drizzle(client, { schema });

  const [user] = await db
    .insert(schema.users)
    .values({
      tenantId: params.tenantId,
      email: params.email,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl,
    })
    .onConflictDoUpdate({
      target: [schema.users.tenantId, schema.users.email],
      set: { displayName: params.displayName, avatarUrl: params.avatarUrl, updatedAt: new Date() },
    })
    .returning();

  if (!user) {
    throw new Error('upsertUserByEmail: insert did not return a row');
  }

  return user;
}
