import { z } from 'zod';
import { userSchema } from './user.js';

export const authProvider = z.enum(['google', 'github']);
export type AuthProvider = z.infer<typeof authProvider>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const logoutResponseSchema = z.object({
  success: z.literal(true),
});
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
