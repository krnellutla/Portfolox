import { z } from 'zod';

const defaultApiBaseUrl =
  import.meta.env.PROD && import.meta.env.MODE !== 'desktop' ? '/api' : '';

const envSchema = z.object({
  // Empty string (the default in dev) means "same origin as the page", relying
  // on the Vite dev server's /auth and /nodes proxy (see vite.config.ts). In
  // web production builds (when unset), defaults to '/api' so requests reach
  // the Vercel /api/* serverless handler rather than the SPA fallback.
  VITE_API_BASE_URL: z
    .union([z.literal(''), z.string().url(), z.string().regex(/^\/[A-Za-z0-9_-]+$/)])
    .default(defaultApiBaseUrl),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(import.meta.env);
