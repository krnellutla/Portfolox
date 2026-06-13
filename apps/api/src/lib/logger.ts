import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Base structured logger. Redaction covers auth headers, cookies, and any
 * field literally named token/password/secret at any depth — request
 * bodies/headers must never leak credentials into logs.
 */
const SENSITIVE_FIELDS = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'clientSecret'];

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      ...SENSITIVE_FIELDS.flatMap((field) => [field, `*.${field}`, `*.*.${field}`]),
    ],
    censor: '[REDACTED]',
  },
});
