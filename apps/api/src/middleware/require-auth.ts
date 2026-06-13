import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { verifyAccessToken } from '../lib/jwt.js';

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;

  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

/**
 * Verifies the access token and attaches req.user. Rejects tokens issued
 * for a different tenant than the one resolved for this host, preventing a
 * token from tenant A being used against tenant B's host.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    throw AppError.unauthorized('Missing or invalid Authorization header');
  }

  let payload;
  try {
    payload = await verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }

  if (payload.tenantId !== req.tenant?.id) {
    throw AppError.unauthorized('Token is not valid for this tenant');
  }

  req.user = { id: payload.sub, tenantId: payload.tenantId, email: payload.email };

  next();
});
