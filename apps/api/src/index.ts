import { app } from './app.js';
import { env } from './config/env.js';
import { assertRuntimeRoleSafe, assertTenantTablesRlsEnforced } from './db/assert-runtime-role.js';
import { pool } from './db/client.js';
import { logger } from './lib/logger.js';

async function main() {
  await assertRuntimeRoleSafe(pool);
  await assertTenantTablesRlsEnforced(pool);

  const port = env.PORT;

  app.listen(port, () => {
    logger.info({ port }, 'api listening');
  });
}

if (env.NODE_ENV !== 'test') {
  main().catch((err) => {
    logger.error({ err }, 'failed to start api');
    process.exit(1);
  });
}

export { app };
