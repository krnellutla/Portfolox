import type { ApiEnvelope } from '@blueflutes/shared';
import { Router } from 'express';

export const healthRouter: Router = Router();

healthRouter.get('/health', (_req, res) => {
  const body: ApiEnvelope<{ status: 'ok' }> = {
    data: { status: 'ok' },
    error: null,
  };
  res.json(body);
});
