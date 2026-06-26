import { describe, expect, it } from 'vitest';
import { stripLocationQuery } from '../../src/middleware/request-logging.js';

describe('stripLocationQuery', () => {
  it('strips the query string from a redirect Location header before logging', () => {
    const res = {
      statusCode: 302,
      headers: { location: 'blueflutes://auth/callback?refresh_token=super-secret-token' },
    };

    const serialized = stripLocationQuery(res);

    expect(serialized.headers.location).toBe('blueflutes://auth/callback');
    expect(JSON.stringify(serialized)).not.toContain('super-secret-token');
  });

  it('leaves a Location header with no query string unchanged', () => {
    const res = { statusCode: 302, headers: { location: 'http://localhost:5173' } };

    expect(stripLocationQuery(res)).toEqual(res);
  });

  it('passes through responses with no Location header', () => {
    const res = { statusCode: 200, headers: {} };

    expect(stripLocationQuery(res)).toEqual(res);
  });
});
