import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';
import * as schema from '../db/schema/index.js';

export async function findUserById(client: PoolClient, userId: string) {
  const db = drizzle(client, { schema });
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  return user;
}
