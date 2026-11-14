import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  email: string;
}

// HS256 (symmetric HMAC) is acceptable for a monolith where a single service
// both signs and verifies tokens. If the architecture ever splits into separate
// services that need to verify tokens independently, migrate to RS256 or ES256
// (asymmetric) so verifiers only need the public key, not the signing secret.
export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ tenantId: payload.tenantId, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.tenantId !== 'string' ||
    typeof payload.email !== 'string'
  ) {
    throw new Error('Invalid access token payload');
  }

  return { sub: payload.sub, tenantId: payload.tenantId, email: payload.email };
}
