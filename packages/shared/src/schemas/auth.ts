import { z } from 'zod';
import { userSchema } from './user.js';

export const authProvider = z.enum(['google', 'github']);
export type AuthProvider = z.infer<typeof authProvider>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

/**
 * Returned instead of `refreshResponseSchema` for desktop clients (no
 * httpOnly cookie support across the tauri:// origin): the rotated refresh
 * token is returned in the body so the client can persist it to the OS
 * keychain.
 */
export const desktopRefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userSchema,
});
export type DesktopRefreshResponse = z.infer<typeof desktopRefreshResponseSchema>;

export const logoutResponseSchema = z.object({
  success: z.literal(true),
});
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
