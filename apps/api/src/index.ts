import express, { type Express } from 'express';
import type { ApiEnvelope, Tenant } from '@portfoliohub/shared';

const app: Express = express();

app.get('/health', (_req, res) => {
  const body: ApiEnvelope<{ status: 'ok' }> = {
    data: { status: 'ok' },
    error: null,
  };
  res.json(body);
});

const port = process.env.PORT ?? 3001;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`api listening on port ${port}`);
  });
}

export type { Tenant };
export { app };
