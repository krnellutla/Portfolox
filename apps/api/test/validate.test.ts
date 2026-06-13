import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/lib/app-error.js';
import { validate } from '../src/lib/validate.js';

describe('validate', () => {
  it('passes parsed data through and calls next() on success', () => {
    const schema = z.object({ name: z.string() });
    const middleware = validate({ body: schema });

    const req = { body: { name: 'Tenant A' } } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Tenant A' });
  });

  it('strips unknown keys via the schema and assigns the parsed value back', () => {
    const schema = z.object({ name: z.string() });
    const middleware = validate({ body: schema });

    const req = { body: { name: 'Tenant A', extra: 'nope' } } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(req.body).toEqual({ name: 'Tenant A' });
  });

  it('calls next with a VALIDATION_ERROR AppError on failure', () => {
    const schema = z.object({ name: z.string() });
    const middleware = validate({ body: schema });

    const req = { body: {} } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = vi.mocked(next).mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as unknown as AppError).code).toBe('VALIDATION_ERROR');
    expect((err as unknown as AppError).httpStatus).toBe(422);
    expect((err as unknown as AppError).message).toContain('name');
  });

  it('validates multiple schemas independently', () => {
    const middleware = validate({
      params: z.object({ id: z.string().uuid() }),
      query: z.object({ page: z.coerce.number().int().positive() }),
    });

    const req = {
      params: { id: '11111111-1111-1111-1111-111111111111' },
      query: { page: '2' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 2 });
  });
});
