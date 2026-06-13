import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import request from 'supertest';
import { createTestPool } from './db-test-utils.js';

describe('GET /health', () => {
  const pool = createTestPool();
  const app = createApp(pool);

  afterAll(async () => {
    await pool.end();
  });

  it('responds with a standard envelope before tenant resolution', async () => {
    const res = await request(app).get('/health').set('Host', 'unknown.example.com');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok' }, error: null });
  });

  it('echoes a request id header', async () => {
    const res = await request(app).get('/health').set('Host', 'unknown.example.com');

    expect(res.headers['x-request-id']).toBeTruthy();
  });
});

describe('unknown host', () => {
  const pool = createTestPool();
  const app = createApp(pool);

  afterAll(async () => {
    await pool.end();
  });

  it('returns a clean 404 envelope for an unresolvable tenant host', async () => {
    const res = await request(app).get('/nodes').set('Host', 'unknown.example.com');

    expect(res.status).toBe(404);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Tenant not found for this host',
    });
  });

  it('returns a clean 404 envelope for a missing Host header', async () => {
    const res = await request(app).get('/nodes').set('Host', '');

    expect(res.status).toBe(404);
    expect(res.body.data).toBeNull();
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });
});
