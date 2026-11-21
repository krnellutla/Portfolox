import type { ApiEnvelope, DesktopRefreshResponse, LogoutResponse, RefreshResponse } from '@blueflutes/shared';
import { otpRequestSchema, otpVerifySchema } from '@blueflutes/shared';
import { Router } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { clearRefreshTokenCookie, getRefreshTokenCookie, setRefreshTokenCookie } from '../lib/cookies.js';
import { getDesktopRefreshTokenHeader } from '../lib/desktop-auth.js';
import { signAccessToken } from '../lib/jwt.js';
import { createRefreshTokenFamily, revokeRefreshToken, revokeTokenFamily, rotateRefreshToken, ReuseDetectedError } from '../lib/refresh-tokens.js';
import { otpRequestRateLimit } from '../middleware/rate-limit.js';
import { sendMagicLinkEmail, sendOtpEmail } from '../services/email.js';
import { createMagicLink, verifyMagicLink, MAGIC_LINK_TTL_MS } from '../services/magic-links.js';
import { createOtpCode, verifyOtpCode, OTP_TTL_MS } from '../services/otp.js';
import { findTenantById } from '../services/tenants.js';
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

    const { code, expiresAt, tenantName } = await req.withTenant(async (client) => {
      const otp = await createOtpCode(client, { tenantId: tenant.id, email, ip: req.ip ?? null });
      const tenantRow = await findTenantById(client, tenant.id);
      return { ...otp, tenantName: tenantRow?.name ?? '' };
    });

    await sendOtpEmail({
      to: email,
      code,
      tenantName,
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

    const isDesktopClient = req.query.client === 'desktop';

    const { user, token, expiresAt } = await req.withTenant(async (client) => {
      // Throws on bad/expired/exhausted code
      await verifyOtpCode(client, { tenantId: tenant.id, email, code });
      const user = await findOrCreateUserByEmail(client, { tenantId: tenant.id, email });
      const { token, expiresAt } = await createRefreshTokenFamily(client, {
        tenantId: tenant.id,
        userId: user.id,
        ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
        userAgent: req.headers['user-agent'] ?? null,
        ip: req.ip ?? null,
      });
      return { user, token, expiresAt };
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

    const { user, rotated } = await req.withTenant(async (client) => {
      const rotated = await rotateRefreshToken(client, {
        token: refreshToken,
        tenantId: req.tenant!.id,
        ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
        userAgent: req.headers['user-agent'] ?? null,
        ip: req.ip ?? null,
      });
      const user = await findUserById(client, rotated.userId);
      if (!user) throw AppError.unauthorized('User not found');
      return { user, rotated };
    }).catch(async (err: unknown) => {
      if (err instanceof ReuseDetectedError) {
        // Revoke the entire token family in its own committed transaction,
        // separate from the now-rolled-back rotation attempt above.
        await req.withTenant!((client) =>
          revokeTokenFamily(client, req.tenant!.id, err.familyId),
        );
        throw AppError.unauthorized('Refresh token reuse detected');
      }
      throw err;
    });

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

// POST /auth/magic/request — send a one-click sign-in link to the given email
authRouter.post(
  '/auth/magic/request',
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

    const { token, expiresAt, tenantName } = await req.withTenant(async (client) => {
      const link = await createMagicLink(client, { tenantId: tenant.id, email, ip: req.ip ?? null });
      const tenantRow = await findTenantById(client, tenant.id);
      return { ...link, tenantName: tenantRow?.name ?? '' };
    });

    const rawNext = typeof req.query.next === 'string' ? req.query.next : '/studio/dashboard';
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/studio/dashboard';
    const verifyUrl = `${env.WEB_APP_URL}/api/auth/magic/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`;

    await sendMagicLinkEmail({
      to: email,
      url: verifyUrl,
      tenantName,
      expiresInMinutes: Math.ceil(MAGIC_LINK_TTL_MS / 60_000),
    });

    const response: ApiEnvelope<{ expiresAt: string }> = {
      data: { expiresAt: expiresAt.toISOString() },
      error: null,
    };
    res.json(response);
  }),
);

// GET /auth/magic/verify — verify token, set refresh cookie, redirect to SPA
authRouter.get(
  '/auth/magic/verify',
  asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !req.withTenant) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const rawToken = typeof req.query.token === 'string' ? req.query.token : null;
    const rawNext = typeof req.query.next === 'string' ? req.query.next : '/studio/dashboard';
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/studio/dashboard';

    if (!rawToken) {
      return res.redirect(302, `/login?error=invalid_link`);
    }

    try {
      await req.withTenant(async (client) => {
        const { email } = await verifyMagicLink(client, { tenantId: tenant.id, token: rawToken });
        const user = await findOrCreateUserByEmail(client, { tenantId: tenant.id, email });
        const { token: refreshToken, expiresAt } = await createRefreshTokenFamily(client, {
          tenantId: tenant.id,
          userId: user.id,
          ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
          userAgent: req.headers['user-agent'] ?? null,
          ip: req.ip ?? null,
        });
        setRefreshTokenCookie(res, refreshToken, expiresAt);
      });
    } catch {
      return res.redirect(302, `/login?error=invalid_link`);
    }

    return res.redirect(302, `/auth/magic/callback?next=${encodeURIComponent(next)}`);
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
      await req.withTenant((client) =>
        revokeRefreshToken(client, req.tenant!.id, refreshToken)
      ).catch(() => {
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
