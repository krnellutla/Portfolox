import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/lib/app-error.js';
import { errorHandler } from '../src/middleware/error-handler.js';

function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status: vi.fn(function status(this: Response, code: number) {
      res.statusCode = code;
      return res as unknown as Response;
    }),
    json: vi.fn(function json(this: Response, payload: unknown) {
      res.body = payload;
      return res as unknown as Response;
    }),
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

function mockReq() {
  return {
    log: { error: vi.fn(), warn: vi.fn() },
  } as unknown as Request;
}

describe('errorHandler', () => {
  it('maps an AppError to its code, message, and status', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    errorHandler(AppError.notFound('Tenant not found for this host'), req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Tenant not found for this host' },
    });
  });

  it('maps a ZodError to a 422 VALIDATION_ERROR envelope', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    let zodError: ZodError;
    try {
      z.object({ name: z.string() }).parse({});
      throw new Error('expected parse to throw');
    } catch (err) {
      zodError = err as ZodError;
    }

    errorHandler(zodError, req, res, next);

    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
    });
  });

  it('maps an unknown error to a 500 INTERNAL_ERROR envelope without leaking details', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    errorHandler(new Error('something secret broke'), req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(req.log.error).toHaveBeenCalled();
  });
});
