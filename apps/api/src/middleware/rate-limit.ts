import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const skip = () => env.NODE_ENV === 'test';

/**
 * 10 requests per 15 minutes per IP+tenant — applied to all /auth/* routes.
 * Keyed by `${ip}:${tenantId}` so users behind a shared NAT don't share a
 * single bucket across tenants; an attacker on the same NAT can only exhaust
 * their own tenant's quota, not every tenant's.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const expressReq = req as Request;
    const ip = expressReq.ip ?? 'unknown';
    const tenantId = expressReq.tenant?.id ?? 'unknown';
    return `${ip}:${tenantId}`;
  },
  message: { data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
});

/** 60 requests per minute per IP — applied to authenticated write endpoints */
export const writeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
});

/**
 * 3 OTP requests per email+IP per 10 minutes.
 * Keyed by `${ip}:${email}` to prevent one attacker from starving all users,
 * while still limiting per-email abuse from a single source.
 */
export const otpRequestRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const ip = req.ip ?? 'unknown';
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
    return `${ip}:${email}`;
  },
  message: { data: null, error: { code: 'RATE_LIMITED', message: 'Too many sign-in requests for this email. Please wait before trying again.' } },
});
