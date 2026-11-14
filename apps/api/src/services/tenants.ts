import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';
import * as schema from '../db/schema/index.js';

/** Fetches a tenant record by its ID. Returns null when not found. */
export async function findTenantById(client: PoolClient, tenantId: string) {
  const db = drizzle(client, { schema });
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId));
  return tenant ?? null;
}
