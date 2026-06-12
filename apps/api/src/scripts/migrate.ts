import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '../config/env.js';

async function main() {
  const pool = new Pool({ connectionString: env.DATABASE_MIGRATION_URL });
  const db = drizzle(pool);

  await migrate(db, { migrationsFolder: './src/db/migrations' });

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
