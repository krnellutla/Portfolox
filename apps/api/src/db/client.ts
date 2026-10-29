import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
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

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
  ssl,
});

export const db = drizzle(pool, { schema });
