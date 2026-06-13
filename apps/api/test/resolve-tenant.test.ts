import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { withTenant } from '../src/db/with-tenant.js';
import { AppError } from '../src/lib/app-error.js';
import { normalizeHost, resolveTenant } from '../src/middleware/resolve-tenant.js';
import { createTestMigratorPool, createTestPool } from './db-test-utils.js';

describe('normalizeHost', () => {
  it('lowercases and strips the port', () => {
    expect(normalizeHost('Example.com:3000')).toBe('example.com');
  });

  it('preserves IPv6 literals including their brackets', () => {
    expect(normalizeHost('[::1]:3000')).toBe('[::1]');
  });

  it('returns null for missing or empty host', () => {
    expect(normalizeHost(undefined)).toBeNull();
    expect(normalizeHost('')).toBeNull();
    expect(normalizeHost('   ')).toBeNull();
  });
});

describe('resolveTenant middleware', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const hostA = `a-${randomUUID()}.example.com`;
  const hostB = `b-${randomUUID()}.example.com`;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
    });

    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id IN ($1, $2)', [
      tenantA,
      tenantB,
    ]);
    await migratorPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);
    await pool.end();
    await migratorPool.end();
  });

  function mockReqRes(host: string | undefined) {
    const req = { headers: { host } } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;
    return { req, res, next };
  }

  it('resolves two different hosts to two different tenants', async () => {
    const middleware = resolveTenant(pool);

    const a = mockReqRes(hostA);
    await middleware(a.req, a.res, a.next);
    expect(a.next).toHaveBeenCalledWith();
    expect(a.req.tenant?.id).toBe(tenantA);
    expect(a.req.withTenant).toBeTypeOf('function');

    const b = mockReqRes(hostB);
    await middleware(b.req, b.res, b.next);
    expect(b.next).toHaveBeenCalledWith();
    expect(b.req.tenant?.id).toBe(tenantB);

    expect(a.req.tenant?.id).not.toBe(b.req.tenant?.id);
  });

  it('rejects an unknown host with a 404 AppError', async () => {
    const middleware = resolveTenant(pool);
    const { req, res, next } = mockReqRes('unknown.example.com');

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = vi.mocked(next).mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as unknown as AppError).code).toBe('NOT_FOUND');
    expect((err as unknown as AppError).httpStatus).toBe(404);
    expect(req.tenant).toBeUndefined();
  });

  it('rejects a missing Host header with a 404 AppError', async () => {
    const middleware = resolveTenant(pool);
    const { req, res, next } = mockReqRes(undefined);

    await middleware(req, res, next);

    const err = vi.mocked(next).mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as unknown as AppError).code).toBe('NOT_FOUND');
  });
});
