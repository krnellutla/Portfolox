import { z } from 'zod';
import { userSchema } from './user.js';

// OTP request — POST /auth/otp/request
export const otpRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});
export type OtpRequest = z.infer<typeof otpRequestSchema>;

// OTP verification — POST /auth/otp/verify
export const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});
export type OtpVerify = z.infer<typeof otpVerifySchema>;

export const otpRequestResponseSchema = z.object({
  expiresAt: z.string().datetime(),
});
export type OtpRequestResponse = z.infer<typeof otpRequestResponseSchema>;

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
