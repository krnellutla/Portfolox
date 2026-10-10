import { z } from 'zod';

const envSchema = z.object({
  // Empty string (the default) means "same origin as the page", relying on
  // the Vite dev server's /auth and /nodes proxy (see vite.config.ts). Set
  // to a path prefix such as /api when a reverse proxy serves the API under
  // that prefix on the same origin, or to an absolute URL only when the API
  // is served from a different origin with CORS configured for it.
  VITE_API_BASE_URL: z
    .union([z.literal(''), z.string().url(), z.string().regex(/^\/[A-Za-z0-9_-]+$/)])
    .default(''),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(import.meta.env);
