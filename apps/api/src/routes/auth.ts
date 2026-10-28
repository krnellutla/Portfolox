import type { ApiEnvelope, DesktopRefreshResponse, LogoutResponse, RefreshResponse } from '@blueflutes/shared';
import { authProvider } from '@blueflutes/shared';
import { Router } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { clearRefreshTokenCookie, getRefreshTokenCookie, setRefreshTokenCookie } from '../lib/cookies.js';
import { getDesktopRefreshTokenHeader } from '../lib/desktop-auth.js';
import { signAccessToken } from '../lib/jwt.js';
import { createAuthorizationRequest, exchangeAuthorizationCode, GOOGLE_SCOPES_JOINED } from '../lib/oauth-providers.js';
import { fetchOAuthProfile } from '../lib/oauth-profile.js';
import { clearOAuthStateCookie, readOAuthStateCookie, setOAuthStateCookie } from '../lib/oauth-state.js';
import { createRefreshTokenFamily, revokeRefreshToken, rotateRefreshToken } from '../lib/refresh-tokens.js';
import { findUserById, upsertUserByEmail } from '../services/users.js';
import { upsertGoogleOauthTokens } from '../services/google-photos.js';

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
    const client = req.query.client === 'desktop' ? 'desktop' : undefined;
    setOAuthStateCookie(res, { provider, state, codeVerifier, client });
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

    // Store Google OAuth tokens for Google Photos access
    if (provider === 'google') {
      await withTenant((client) =>
        upsertGoogleOauthTokens(client, {
          tenantId,
          userId: user.id,
          accessToken: tokens.accessToken(),
          refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
          expiresAt: tokens.accessTokenExpiresAt(),
          scopes: tokens.hasScopes() ? tokens.scopes().join(' ') : GOOGLE_SCOPES_JOINED,
        }),
      );
    }

    const issued = await withTenant((client) =>
      createRefreshTokenFamily(client, {
        tenantId,
        userId: user.id,
        ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      }),
    );

    if (stateCookie.client === 'desktop') {
      // System-browser flow: there is no cookie jar shared with the desktop
      // app's webview, so hand off the freshly issued refresh token via the
      // app's registered deep link. The desktop app exchanges it for an
      // access token via /auth/refresh (X-Refresh-Token) and persists the
      // rotated token to the OS keychain.
      const redirectUrl = new URL(env.DESKTOP_AUTH_REDIRECT_URL);
      redirectUrl.searchParams.set('refresh_token', issued.token);
      res.redirect(redirectUrl.toString());
      return;
    }

    setRefreshTokenCookie(res, issued.token, issued.expiresAt);
    res.redirect(`${env.WEB_APP_URL}/auth/callback`);
  }),
);

authRouter.post(
  '/auth/refresh',
  asyncHandler(async (req, res) => {
    const tenantId = req.tenant?.id;
    if (!tenantId || !req.withTenant) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const cookieToken = getRefreshTokenCookie(req);
    const desktopToken = getDesktopRefreshTokenHeader(req);
    const refreshToken = cookieToken ?? desktopToken;
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

    if (cookieToken) {
      setRefreshTokenCookie(res, rotated.token, rotated.expiresAt);
      const body: ApiEnvelope<RefreshResponse> = { data: { accessToken, user }, error: null };
      res.json(body);
      return;
    }

    // Desktop: no cookie to set across the tauri:// origin — return the
    // rotated refresh token in the body so the client persists it to the OS
    // keychain.
    const body: ApiEnvelope<DesktopRefreshResponse> = {
      data: { accessToken, refreshToken: rotated.token, user },
      error: null,
    };
    res.json(body);
  }),
);

authRouter.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    const tenantId = req.tenant?.id;
    const refreshToken = getRefreshTokenCookie(req) ?? getDesktopRefreshTokenHeader(req);

    if (tenantId && refreshToken && req.withTenant) {
      const withTenant = req.withTenant;
      await withTenant((client) => revokeRefreshToken(client, tenantId, refreshToken));
    }

    clearRefreshTokenCookie(res);

    const body: ApiEnvelope<LogoutResponse> = { data: { success: true }, error: null };
    res.json(body);
  }),
);
