import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  DATABASE_MIGRATION_URL: z.string().url(),
  DATABASE_TEST_URL: z.string().url().optional(),
  DATABASE_TEST_MIGRATION_URL: z.string().url().optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30_000),
  DB_APP_ROLE: z.string().min(1).default('blueflutes_app'),
  DB_APP_ROLE_PASSWORD: z.string().min(1).optional(),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
  OAUTH_REDIRECT_BASE_URL: z.string().url().default('http://localhost:3001'),
  WEB_APP_URL: z.string().url().default('http://localhost:5173'),

  // Comma-separated list of additional origins allowed to make
  // credentialed cross-origin requests (e.g. the Tauri desktop shell's
  // tauri://localhost / http://tauri.localhost origins). The web app's own
  // origin does not need to be listed here: it talks to the API same-origin
  // through the Vite dev proxy / same-origin prod serving.
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),

  // Deep link the desktop app registers to receive the OAuth callback
  // (system-browser flow): the API redirects here with a one-time refresh
  // token instead of setting the refresh cookie. Restricted to the
  // app's custom URL scheme so a misconfigured env can't redirect a live
  // refresh token to an arbitrary http(s) endpoint.
  DESKTOP_AUTH_REDIRECT_URL: z
    .string()
    .url()
    .default('blueflutes://auth/callback')
    .refine((value) => new URL(value).protocol === 'blueflutes:', {
      message: 'DESKTOP_AUTH_REDIRECT_URL must use the blueflutes: scheme',
    }),

  // Storage (S3-compatible: AWS S3, Cloudflare R2, MinIO)
  STORAGE_PROVIDER: z.enum(['s3', 'fake']).default('fake'),
  STORAGE_BUCKET: z.string().min(1).optional(),
  STORAGE_REGION: z.string().min(1).optional(),
  STORAGE_ENDPOINT: z.string().url().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().min(1).optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().url().optional(),
  MEDIA_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(50 * 1024 * 1024),
  MEDIA_PRESIGN_TTL_SECONDS: z.coerce.number().int().positive().default(300),
}).superRefine((data, ctx) => {
  if (data.STORAGE_PROVIDER === 's3') {
    const required = [
      ['STORAGE_BUCKET', data.STORAGE_BUCKET],
      ['STORAGE_REGION', data.STORAGE_REGION],
      ['STORAGE_ACCESS_KEY_ID', data.STORAGE_ACCESS_KEY_ID],
      ['STORAGE_SECRET_ACCESS_KEY', data.STORAGE_SECRET_ACCESS_KEY],
      ['STORAGE_PUBLIC_BASE_URL', data.STORAGE_PUBLIC_BASE_URL],
    ] as const;

    for (const [key, value] of required) {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required when STORAGE_PROVIDER=s3`,
          path: [key],
        });
      }
    }
  }
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
