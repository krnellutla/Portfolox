import type { ApiEnvelope, DesktopRefreshResponse, LogoutResponse, RefreshResponse } from '@blueflutes/shared';
import { otpRequestSchema, otpVerifySchema } from '@blueflutes/shared';
import { Router } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { clearRefreshTokenCookie, getRefreshTokenCookie, setRefreshTokenCookie } from '../lib/cookies.js';
import { getDesktopRefreshTokenHeader } from '../lib/desktop-auth.js';
import { signAccessToken } from '../lib/jwt.js';
import { createRefreshTokenFamily, revokeRefreshToken, rotateRefreshToken } from '../lib/refresh-tokens.js';
import { otpRequestRateLimit } from '../middleware/rate-limit.js';
import { sendOtpEmail } from '../services/email.js';
import { createOtpCode, verifyOtpCode, OTP_TTL_MS } from '../services/otp.js';
import { findOrCreateUserByEmail, findUserById } from '../services/users.js';

export const authRouter: Router = Router();

// POST /auth/otp/request — send a 6-digit code to the given email
authRouter.post(
  '/auth/otp/request',
  otpRequestRateLimit,
  asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !req.withTenant) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const parsed = otpRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest('Invalid request');
    }
    const { email } = parsed.data;

    const { code, expiresAt } = await createOtpCode(req.withTenant, {
      tenantId: tenant.id,
      email,
      ip: req.ip ?? null,
    });

    await sendOtpEmail({
      to: email,
      code,
      tenantName: tenant.name,
      expiresInMinutes: Math.ceil(OTP_TTL_MS / 60_000),
    });

    const response: ApiEnvelope<{ expiresAt: string }> = {
      data: { expiresAt: expiresAt.toISOString() },
      error: null,
    };
    res.json(response);
  }),
);

// POST /auth/otp/verify — exchange a valid code for an access + refresh token
authRouter.post(
  '/auth/otp/verify',
  asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !req.withTenant) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const parsed = otpVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest('Invalid request');
    }
    const { email, code } = parsed.data;

    // Throws on bad/expired/exhausted code
    await verifyOtpCode(req.withTenant, { tenantId: tenant.id, email, code });

    const user = await findOrCreateUserByEmail(req.withTenant, {
      tenantId: tenant.id,
      email,
    });

    const isDesktopClient = req.query.client === 'desktop';
    const { token, expiresAt } = await createRefreshTokenFamily(req.withTenant, {
      tenantId: tenant.id,
      userId: user.id,
      ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    });

    const accessToken = await signAccessToken({ sub: user.id, tenantId: tenant.id, email: user.email });

    if (isDesktopClient) {
      const response: ApiEnvelope<DesktopRefreshResponse> = {
        data: { accessToken, refreshToken: token, user },
        error: null,
      };
      res.json(response);
    } else {
      setRefreshTokenCookie(res, token, expiresAt);
      const response: ApiEnvelope<RefreshResponse> = {
        data: { accessToken, user },
        error: null,
      };
      res.json(response);
    }
  }),
);

// POST /auth/refresh — rotate the refresh token
authRouter.post(
  '/auth/refresh',
  asyncHandler(async (req, res) => {
    if (!req.withTenant) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const refreshToken =
      getDesktopRefreshTokenHeader(req) ?? getRefreshTokenCookie(req);

    if (!refreshToken) {
      throw AppError.unauthorized('No refresh token');
    }

    const rotated = await rotateRefreshToken(req.withTenant, {
      token: refreshToken,
      tenantId: req.tenant?.id ?? '',
      ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    });

    const user = await findUserById(req.withTenant, rotated.userId);
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    const accessToken = await signAccessToken({ sub: user.id, tenantId: user.tenantId, email: user.email });
    const isDesktopClient = !!getDesktopRefreshTokenHeader(req);

    if (isDesktopClient) {
      const response: ApiEnvelope<DesktopRefreshResponse> = {
        data: { accessToken, refreshToken: rotated.token, user },
        error: null,
      };
      res.json(response);
    } else {
      setRefreshTokenCookie(res, rotated.token, rotated.expiresAt);
      const response: ApiEnvelope<RefreshResponse> = {
        data: { accessToken, user },
        error: null,
      };
      res.json(response);
    }
  }),
);

// POST /auth/logout — revoke the refresh token server-side
authRouter.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    if (!req.withTenant) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const refreshToken =
      getDesktopRefreshTokenHeader(req) ?? getRefreshTokenCookie(req);

    if (refreshToken) {
      await revokeRefreshToken(req.withTenant, req.tenant?.id ?? '', refreshToken).catch(() => {
        // Best-effort — if the token is already invalid, that's fine
      });
    }

    clearRefreshTokenCookie(res);

    const response: ApiEnvelope<LogoutResponse> = {
      data: { success: true },
      error: null,
    };
    res.json(response);
  }),
);
