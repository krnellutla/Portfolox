// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/auth-store.js';
import { SessionProvider } from './SessionProvider.js';

vi.mock('../api/auth.js', () => ({
  refreshAccessToken: vi.fn(),
}));
vi.mock('../api/client.js', () => ({
  setAccessToken: vi.fn(),
}));

const { refreshAccessToken } = await import('../api/auth.js');

describe('SessionProvider', () => {
  afterEach(() => {
    cleanup();
    useAuthStore.setState({ status: 'idle', user: null });
    vi.resetAllMocks();
  });

  it('shows a splash while the silent refresh is in flight', () => {
    vi.mocked(refreshAccessToken).mockReturnValue(new Promise(() => {}));

    render(
      <SessionProvider>
        <p>App content</p>
      </SessionProvider>,
    );

    expect(screen.getByText('Loading…')).toBeDefined();
    expect(screen.queryByText('App content')).toBeNull();
  });

  it('renders children once the refresh resolves with a session', async () => {
    const user = {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: '00000000-0000-0000-0000-000000000002',
      email: 'user@example.com',
      displayName: 'User',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(refreshAccessToken).mockResolvedValue({ accessToken: 'token', user });

    render(
      <SessionProvider>
        <p>App content</p>
      </SessionProvider>,
    );

    expect(await screen.findByText('App content')).toBeDefined();
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('renders children (unauthenticated) once the refresh resolves with no session', async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue(null);

    render(
      <SessionProvider>
        <p>App content</p>
      </SessionProvider>,
    );

    expect(await screen.findByText('App content')).toBeDefined();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
