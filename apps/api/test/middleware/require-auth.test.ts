import type { NextFunction, Request, Response } from 'express';
import { SignJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { AppError } from '../../src/lib/app-error.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { requireAuth } from '../../src/middleware/require-auth.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

function mockReqRes(opts: { authorization?: string; tenantId?: string }) {
  const req = {
    headers: { authorization: opts.authorization },
    tenant: opts.tenantId ? { id: opts.tenantId } : undefined,
  } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

describe('requireAuth', () => {
  const tenantId = '22222222-2222-2222-2222-222222222222';
  const userId = '11111111-1111-1111-1111-111111111111';
  const email = 'user@example.com';

  it('attaches req.user for a valid access token matching the resolved tenant', async () => {
    const token = await signAccessToken({ sub: userId, tenantId, email });
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}`, tenantId });

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: userId, tenantId, email });
  });

  it('rejects a missing Authorization header', async () => {
    const { req, res, next } = mockReqRes({ tenantId });

    await requireAuth(req, res, next);

    const err = vi.mocked(next).mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as unknown as AppError).code).toBe('UNAUTHORIZED');
  });

  it('rejects a non-Bearer Authorization header', async () => {
    const { req, res, next } = mockReqRes({ authorization: 'Basic abc123', tenantId });

    await requireAuth(req, res, next);

    const err = vi.mocked(next).mock.calls[0]?.[0];
    expect((err as unknown as AppError).code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed/invalid token', async () => {
    const { req, res, next } = mockReqRes({ authorization: 'Bearer not-a-jwt', tenantId });

    await requireAuth(req, res, next);

    const err = vi.mocked(next).mock.calls[0]?.[0];
    expect((err as unknown as AppError).code).toBe('UNAUTHORIZED');
  });

  it('rejects an expired token', async () => {
    const token = await new SignJWT({ tenantId, email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(secret);

    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}`, tenantId });

    await requireAuth(req, res, next);

    const err = vi.mocked(next).mock.calls[0]?.[0];
    expect((err as unknown as AppError).code).toBe('UNAUTHORIZED');
  });

  it('rejects a token issued for a different tenant than the resolved host', async () => {
    const otherTenantId = '33333333-3333-3333-3333-333333333333';
    const token = await signAccessToken({ sub: userId, tenantId: otherTenantId, email });
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}`, tenantId });

    await requireAuth(req, res, next);

    const err = vi.mocked(next).mock.calls[0]?.[0];
    expect((err as unknown as AppError).code).toBe('UNAUTHORIZED');
    expect(req.user).toBeUndefined();
  });
});
