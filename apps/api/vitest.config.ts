import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env.test in the main process so workers inherit the vars (including
// NODE_ENV=test), which lets the rate-limiter skip() work in tests.
config({ path: join(__dirname, '.env.test'), override: true });

export default defineConfig({
  test: {
    passWithNoTests: true,
  },
});
