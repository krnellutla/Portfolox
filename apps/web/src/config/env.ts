import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3001'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(import.meta.env);
