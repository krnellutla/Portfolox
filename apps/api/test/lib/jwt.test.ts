import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../../src/lib/jwt.js';

describe('access token sign/verify', () => {
  const payload = {
    sub: '11111111-1111-1111-1111-111111111111',
    tenantId: '22222222-2222-2222-2222-222222222222',
    email: 'user@example.com',
  };

  it('round-trips a signed access token', async () => {
    const token = await signAccessToken(payload);
    const verified = await verifyAccessToken(token);

    expect(verified).toEqual(payload);
  });

  it('rejects a token with a tampered signature', async () => {
    const token = await signAccessToken(payload);
    const [header, body, signature] = token.split('.');
    const tamperedChar = signature?.[0] === 'A' ? 'B' : 'A';
    const tampered = `${header}.${body}.${tamperedChar}${signature?.slice(1)}`;

    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });
});
