import type { ApiEnvelope, LogoutResponse, RefreshResponse } from '@portfoliohub/shared';
import { Router } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { clearRefreshTokenCookie, getRefreshTokenCookie, setRefreshTokenCookie } from '../lib/cookies.js';
import { signAccessToken } from '../lib/jwt.js';
import { revokeRefreshToken, rotateRefreshToken } from '../lib/refresh-tokens.js';
import { findUserById } from '../services/users.js';

export const authRouter: Router = Router();

authRouter.post(
  '/auth/refresh',
  asyncHandler(async (req, res) => {
    const tenantId = req.tenant?.id;
    if (!tenantId || !req.withTenant) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const refreshToken = getRefreshTokenCookie(req);
    if (!refreshToken) {
      throw AppError.unauthorized('Missing refresh token');
    }

    const withTenant = req.withTenant;

    const rotated = await withTenant((client) =>
      rotateRefreshToken(client, {
        tenantId,
        token: refreshToken,
        ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      }),
    );

    const user = await withTenant((client) => findUserById(client, rotated.userId));
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    const accessToken = await signAccessToken({ sub: user.id, tenantId, email: user.email });
    setRefreshTokenCookie(res, rotated.token, rotated.expiresAt);

    const body: ApiEnvelope<RefreshResponse> = { data: { accessToken, user }, error: null };
    res.json(body);
  }),
);

authRouter.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    const tenantId = req.tenant?.id;
    const refreshToken = getRefreshTokenCookie(req);

    if (tenantId && refreshToken && req.withTenant) {
      const withTenant = req.withTenant;
      await withTenant((client) => revokeRefreshToken(client, tenantId, refreshToken));
    }

    clearRefreshTokenCookie(res);

    const body: ApiEnvelope<LogoutResponse> = { data: { success: true }, error: null };
    res.json(body);
  }),
);
