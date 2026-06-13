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

  it('rejects a token signed with a different secret', async () => {
    const token = await signAccessToken(payload);
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'b' : 'a') + token.slice(-1);

    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });
});
