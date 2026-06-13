import type { ApiEnvelope, LogoutResponse, RefreshResponse } from '@portfoliohub/shared';
import { authProvider } from '@portfoliohub/shared';
import { Router } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { clearRefreshTokenCookie, getRefreshTokenCookie, setRefreshTokenCookie } from '../lib/cookies.js';
import { signAccessToken } from '../lib/jwt.js';
import { createAuthorizationRequest, exchangeAuthorizationCode } from '../lib/oauth-providers.js';
import { fetchOAuthProfile } from '../lib/oauth-profile.js';
import { clearOAuthStateCookie, readOAuthStateCookie, setOAuthStateCookie } from '../lib/oauth-state.js';
import { createRefreshTokenFamily, revokeRefreshToken, rotateRefreshToken } from '../lib/refresh-tokens.js';
import { findUserById, upsertUserByEmail } from '../services/users.js';

export const authRouter: Router = Router();

authRouter.get(
  '/auth/:provider',
  asyncHandler(async (req, res) => {
    if (!req.tenant) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const parsedProvider = authProvider.safeParse(req.params.provider);
    if (!parsedProvider.success) {
      throw AppError.notFound('Unknown OAuth provider');
    }
    const provider = parsedProvider.data;

    const { url, state, codeVerifier } = createAuthorizationRequest(provider);
    setOAuthStateCookie(res, { provider, state, codeVerifier });
    res.redirect(url.toString());
  }),
);

authRouter.get(
  '/auth/:provider/callback',
  asyncHandler(async (req, res) => {
    const tenantId = req.tenant?.id;
    if (!tenantId || !req.withTenant) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const parsedProvider = authProvider.safeParse(req.params.provider);
    if (!parsedProvider.success) {
      throw AppError.notFound('Unknown OAuth provider');
    }
    const provider = parsedProvider.data;

    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const stateCookie = readOAuthStateCookie(req);
    clearOAuthStateCookie(res);

    if (!code || !state || !stateCookie || stateCookie.provider !== provider || stateCookie.state !== state) {
      throw AppError.unauthorized('Invalid OAuth state');
    }

    const tokens = await exchangeAuthorizationCode(provider, code, stateCookie.codeVerifier);
    const profile = await fetchOAuthProfile(provider, tokens.accessToken());

    const withTenant = req.withTenant;

    const user = await withTenant((client) =>
      upsertUserByEmail(client, {
        tenantId,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      }),
    );

    const issued = await withTenant((client) =>
      createRefreshTokenFamily(client, {
        tenantId,
        userId: user.id,
        ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      }),
    );

    setRefreshTokenCookie(res, issued.token, issued.expiresAt);
    res.redirect(env.WEB_APP_URL);
  }),
);

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
