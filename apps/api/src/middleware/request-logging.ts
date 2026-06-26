import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { pinoHttp, type HttpLogger } from 'pino-http';
import { logger } from '../lib/logger.js';

/**
 * Strips the query string from a redirect's `Location` header before it
 * hits the log, mirroring the request-side `url` stripping below. Needed so
 * the desktop OAuth callback's one-time refresh token
 * (`/auth/:provider/callback?...&refresh_token=...` -> `Location:
 * blueflutes://auth/callback?refresh_token=...`) is never written to logs
 * in plaintext.
 */
export function stripLocationQuery<T extends { headers?: { location?: unknown } }>(res: T): T {
  const location = res.headers?.location;
  if (typeof location === 'string' && location.includes('?')) {
    return { ...res, headers: { ...res.headers, location: location.split('?')[0] } };
  }
  return res;
}

/**
 * Structured request logging via pino-http. Placed first in the pipeline so
 * req.id/req.log are available to every later middleware (including
 * resolve-tenant's error path), and an `X-Request-Id` is echoed back for
 * client-side trace correlation. The final log line (emitted on response
 * finish) includes tenantId via customProps, read from req.tenant once
 * resolve-tenant has run.
 */
export const requestLogging: HttpLogger<Request, Response> = pinoHttp<Request, Response>({
  logger,
  genReqId: (req, res) => {
    const header = req.headers['x-request-id'];
    const inbound = Array.isArray(header) ? header[0] : header;
    const requestId = inbound && inbound.length > 0 ? inbound : randomUUID();
    res.setHeader('X-Request-Id', requestId);
    return requestId;
  },
  customProps: (req) => ({
    tenantId: req.tenant?.id ?? null,
  }),
  serializers: {
    // Strip query strings (e.g. OAuth `code`/`state` on /auth/*/callback)
    // before the request hits the log.
    req: (req) => ({ ...req, url: req.url?.split('?')[0] }),
    res: stripLocationQuery,
  },
});
