import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  DATABASE_MIGRATION_URL: z.string().url(),
  DATABASE_TEST_URL: z.string().url().optional(),
  DATABASE_TEST_MIGRATION_URL: z.string().url().optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30_000),
  DB_APP_ROLE: z.string().min(1).default('portfoliohub_app'),
  DB_APP_ROLE_PASSWORD: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
