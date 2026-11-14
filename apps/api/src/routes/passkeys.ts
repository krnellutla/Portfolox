import type {
  ApiEnvelope,
  DesktopRefreshResponse,
  PasskeyListResponse,
  RefreshResponse,
} from '@blueflutes/shared';
import {
  passkeyAuthBeginSchema,
  passkeyCredentialSchema,
  passkeyRenameSchema,
} from '@blueflutes/shared';
import { Router } from 'express';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { signAccessToken } from '../lib/jwt.js';
import { createRefreshTokenFamily } from '../lib/refresh-tokens.js';
import { setRefreshTokenCookie } from '../lib/cookies.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
  beginAuthentication,
  beginRegistration,
  deleteCredential,
  finishAuthentication,
  finishRegistration,
  listCredentials,
  renameCredential,
} from '../services/passkeys.js';
import { findUserById } from '../services/users.js';

export const passkeysRouter: Router = Router();

// ─── Registration (requires active session) ───────────────────────────────────

// POST /auth/passkey/register/begin
passkeysRouter.post(
  '/auth/passkey/register/begin',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !req.withTenant) throw AppError.notFound('Tenant not found');
    if (!req.user) throw AppError.unauthorized('Authentication required');

    const options = await beginRegistration(req.withTenant, {
      tenantId: tenant.id,
      userId: req.user.id,
      userEmail: req.user.email,
      ip: req.ip ?? null,
    });

    const response: ApiEnvelope<typeof options> = { data: options, error: null };
    res.json(response);
  }),
);

// POST /auth/passkey/register/finish
passkeysRouter.post(
  '/auth/passkey/register/finish',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !req.withTenant) throw AppError.notFound('Tenant not found');
    if (!req.user) throw AppError.unauthorized('Authentication required');

    const friendlyName =
      typeof req.body.friendlyName === 'string' ? req.body.friendlyName : null;
    const registrationResponse = req.body.response as RegistrationResponseJSON;

    if (!registrationResponse) throw AppError.badRequest('Missing registration response');

    const credential = await finishRegistration(req.withTenant, {
      tenantId: tenant.id,
      userId: req.user.id,
      response: registrationResponse,
      friendlyName,
    });

    const parsed = passkeyCredentialSchema.parse({
      id: credential.id,
      friendlyName: credential.friendlyName,
      deviceType: credential.deviceType,
      backedUp: credential.backedUp,
      transports: credential.transports,
      aaguid: credential.aaguid,
      lastUsedAt: credential.lastUsedAt,
      createdAt: credential.createdAt,
    });

    const response: ApiEnvelope<typeof parsed> = { data: parsed, error: null };
    res.status(201).json(response);
  }),
);

// ─── Authentication (public — issues tokens) ──────────────────────────────────

// POST /auth/passkey/auth/begin
passkeysRouter.post(
  '/auth/passkey/auth/begin',
  asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !req.withTenant) throw AppError.notFound('Tenant not found');

    const parsed = passkeyAuthBeginSchema.safeParse(req.body);
    const email = parsed.success ? parsed.data.email : undefined;

    const options = await beginAuthentication(req.withTenant, {
      tenantId: tenant.id,
      email: email ?? null,
      ip: req.ip ?? null,
    });

    const response: ApiEnvelope<typeof options> = { data: options, error: null };
    res.json(response);
  }),
);

// POST /auth/passkey/auth/finish
passkeysRouter.post(
  '/auth/passkey/auth/finish',
  asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !req.withTenant) throw AppError.notFound('Tenant not found');

    const authResponse = req.body.response as AuthenticationResponseJSON;
    if (!authResponse) throw AppError.badRequest('Missing authentication response');

    const { userId } = await finishAuthentication(req.withTenant, {
      tenantId: tenant.id,
      response: authResponse,
    });

    const user = await findUserById(req.withTenant, userId);
    if (!user) throw AppError.unauthorized('User not found');

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

// ─── Credential management (requires active session) ─────────────────────────

// GET /auth/passkey/credentials
passkeysRouter.get(
  '/auth/passkey/credentials',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !req.withTenant) throw AppError.notFound('Tenant not found');
    if (!req.user) throw AppError.unauthorized('Authentication required');

    const credentials = await listCredentials(req.withTenant, {
      tenantId: tenant.id,
      userId: req.user.id,
    });

    const response: ApiEnvelope<PasskeyListResponse> = {
      data: { credentials: credentials.map((c) => passkeyCredentialSchema.parse(c)) },
      error: null,
    };
    res.json(response);
  }),
);

// PATCH /auth/passkey/credentials/:id — rename a passkey
passkeysRouter.patch(
  '/auth/passkey/credentials/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !req.withTenant) throw AppError.notFound('Tenant not found');
    if (!req.user) throw AppError.unauthorized('Authentication required');

    const credentialDbId = req.params.id;
    const parsed = passkeyRenameSchema.safeParse(req.body);
    if (!parsed.success) throw AppError.badRequest('friendlyName must be 1–60 characters');

    await renameCredential(req.withTenant, {
      tenantId: tenant.id,
      userId: req.user.id,
      credentialDbId,
      friendlyName: parsed.data.friendlyName,
    });

    const response: ApiEnvelope<{ success: true }> = { data: { success: true }, error: null };
    res.json(response);
  }),
);

// DELETE /auth/passkey/credentials/:id
passkeysRouter.delete(
  '/auth/passkey/credentials/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    if (!tenant || !req.withTenant) throw AppError.notFound('Tenant not found');
    if (!req.user) throw AppError.unauthorized('Authentication required');

    await deleteCredential(req.withTenant, {
      tenantId: tenant.id,
      userId: req.user.id,
      credentialDbId: req.params.id,
    });

    const response: ApiEnvelope<{ success: true }> = { data: { success: true }, error: null };
    res.json(response);
  }),
);
