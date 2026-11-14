import type { IncomingMessage, ServerResponse } from 'node:http';

type AppHandler = (req: IncomingMessage, res: ServerResponse) => unknown;

let cachedApp: AppHandler | null = null;

async function getApp(): Promise<AppHandler> {
  if (!cachedApp) {
    const mod = await import('../apps/api/src/app.js');
    cachedApp = mod.app as AppHandler;
  }
  return cachedApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    // Strip the /api prefix so Express routes at their natural paths (/auth, /nodes, …).
    // Vercel preserves the real Host header on the custom domain, so tenant
    // resolution via req.headers.host works without any X-Forwarded-Host trust.
    const original = req.url ?? '/';
    req.url = original.replace(/^\/api(?=\/|$)/, '') || '/';

    return app(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        data: null,
        error: { code: 'INTERNAL_ERROR', message },
      }),
    );
  }
}
