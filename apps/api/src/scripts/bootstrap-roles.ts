import { Client } from 'pg';
import { env } from '../config/env.js';

/**
 * One-time, idempotent setup of the restricted runtime role on a fresh
 * Postgres instance. Connects as the migration role (which must have
 * CREATEROLE) and creates DB_APP_ROLE with DB_APP_ROLE_PASSWORD if it
 * doesn't already exist. Must run before the 0002_roles.sql grant
 * migration. Safe to re-run.
 */
async function main() {
  if (!env.DB_APP_ROLE_PASSWORD) {
    throw new Error('DB_APP_ROLE_PASSWORD must be set to bootstrap the runtime role');
  }

  const client = new Client({ connectionString: env.DATABASE_MIGRATION_URL });
  await client.connect();

  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [
      env.DB_APP_ROLE,
    ]);

    // NOBYPASSRLS/NOSUPERUSER are intentionally omitted: a CREATEROLE
    // non-superuser (portfoliohub_migrator) cannot grant those attributes
    // anyway, so new roles default to NOBYPASSRLS/NOSUPERUSER, and
    // explicitly restating them here raises a permissions error.
    if (rowCount === 0) {
      await client.query(
        `CREATE ROLE ${client.escapeIdentifier(env.DB_APP_ROLE)} LOGIN PASSWORD ${client.escapeLiteral(env.DB_APP_ROLE_PASSWORD)} NOCREATEDB NOCREATEROLE`,
      );
      console.log(`created role ${env.DB_APP_ROLE}`);
    } else {
      await client.query(
        `ALTER ROLE ${client.escapeIdentifier(env.DB_APP_ROLE)} WITH LOGIN PASSWORD ${client.escapeLiteral(env.DB_APP_ROLE_PASSWORD)} NOCREATEDB NOCREATEROLE`,
      );
      console.log(`updated role ${env.DB_APP_ROLE}`);
    }

    const dbName = new URL(env.DATABASE_MIGRATION_URL).pathname.replace(/^\//, '');
    await client.query(
      `GRANT CONNECT ON DATABASE ${client.escapeIdentifier(dbName)} TO ${client.escapeIdentifier(env.DB_APP_ROLE)}`,
    );

    if (env.DATABASE_TEST_MIGRATION_URL) {
      const testDbName = new URL(env.DATABASE_TEST_MIGRATION_URL).pathname.replace(/^\//, '');
      await client.query(
        `GRANT CONNECT ON DATABASE ${client.escapeIdentifier(testDbName)} TO ${client.escapeIdentifier(env.DB_APP_ROLE)}`,
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
