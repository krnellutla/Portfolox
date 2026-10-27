import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../apps/api/src/app.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Strip the /api prefix so Express routes at their natural paths (/auth, /nodes, …).
  // Vercel preserves the real Host header on the custom domain, so tenant
  // resolution via req.headers.host works without any X-Forwarded-Host trust.
  const original = req.url ?? '/';
  req.url = original.replace(/^\/api(?=\/|$)/, '') || '/';

  return app(req as any, res as any);
}
