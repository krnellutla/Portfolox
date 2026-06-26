import type { ApiEnvelope } from '@blueflutes/shared';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/app-error.js';

/**
 * Terminal error handler: maps thrown errors to the standard ApiEnvelope.
 * Unrecognized errors become a generic 500 INTERNAL_ERROR — the original
 * error is logged server-side (via req.log) but never reflected to the
 * client, to avoid leaking stack traces or internal details.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = AppError.validation('Invalid request');
  } else {
    appError = AppError.internal('Internal server error');
  }

  if (appError.code === 'INTERNAL_ERROR' && !(err instanceof AppError)) {
    req.log.error({ err }, 'unhandled error');
  } else {
    req.log.warn({ err: appError }, appError.message);
  }

  const body: ApiEnvelope<null> = {
    data: null,
    error: { code: appError.code, message: appError.message },
  };

  res.status(appError.httpStatus).json(body);
};
