import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { pinoHttp, type HttpLogger } from 'pino-http';
import { logger } from '../lib/logger.js';

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
});
