import type { NextFunction, Request, Response } from 'express';

/**
 * Pipeline placeholder for Milestone 1.4 (OAuth/JWT auth). Currently a
 * no-op so the middleware order (tenant resolution -> auth -> logging ->
 * routes -> error handler) is established ahead of real auth.
 *
 * TODO(Milestone 1.4): validate the access token, attach req.user, and
 * reject unauthenticated requests to protected routes.
 */
export function requireAuth(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
