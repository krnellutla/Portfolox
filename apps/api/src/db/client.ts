import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import * as schema from './schema/index.js';

// In production (or when connecting to a remote DB such as Supabase) the
// connection string already carries sslmode=require. In development the
// default pg behaviour rejects self-signed cert chains; rejectUnauthorized
// is set to false only when NODE_ENV is not 'production' so that the
// production pool always performs full certificate verification.
const ssl =
  env.NODE_ENV === 'production'
    ? true
    : { rejectUnauthorized: false };

/**
 * Shared PostgreSQL connection pool bound to `DATABASE_URL` (runtime role
 * `DB_APP_ROLE` / `blueflutes_app`). Tenant-scoped queries should acquire a
 * transaction client through `withTenant(tenantId, fn)` so RLS policies apply.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
  ssl,
});

// Safety net: cap every statement at 10 s so a slow tenant-lookup or
// runaway query cannot stall the entire request pipeline.
pool.on('connect', (client) => {
  client.query(`SET statement_timeout = ${env.DB_STATEMENT_TIMEOUT_MS}`).catch((err: unknown) => {
    // Log and swallow — a failed SET degrades protection but must not crash
    // the pool event emitter (pg would emit an 'error' event and potentially
    // crash the process if we threw here instead of catching).
    logger.error({ err }, 'pool.connect: failed to set statement_timeout');
  });
});

/**
 * Drizzle ORM instance configured with the full application schema and shared
 * `pool`. Prefer `withTenant(tenantId, fn)` for all tenant-isolated queries.
 */
export const db = drizzle(pool, { schema });
