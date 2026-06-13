import type { NextFunction, Request, Response } from 'express';

type AsyncMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Express 4 does not forward rejected promises from async handlers to
 * next(). Wrapping in asyncHandler ensures thrown/rejected errors reach the
 * terminal error handler instead of crashing the process.
 */
export function asyncHandler(fn: AsyncMiddleware) {
  return (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return fn(req, res, next).then(
      () => undefined,
      (err: unknown) => next(err),
    );
  };
}
