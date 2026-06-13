import type { PoolClient } from 'pg';

declare global {
  namespace Express {
    interface Request {
      /** Set by resolve-tenant middleware once the Host header is matched. */
      tenant?: {
        id: string;
      };
      /** Runs `callback` inside withTenant(pool, req.tenant.id, callback). */
      withTenant?: <T>(callback: (client: PoolClient) => Promise<T>) => Promise<T>;
      /** Set by requireAuth once the access token has been verified. */
      user?: {
        id: string;
        tenantId: string;
        email: string;
      };
    }
  }
}

export {};
