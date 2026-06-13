// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/auth-store.js';
import { SessionProvider } from './SessionProvider.js';

vi.mock('../api/auth.js', () => ({
  refreshAccessToken: vi.fn(),
}));
vi.mock('../api/client.js', () => ({
  setAccessToken: vi.fn(),
}));
vi.mock('../lib/platform.js', () => ({ isDesktop: vi.fn(() => false) }));
vi.mock('../lib/secure-storage.js', () => ({
  setRefreshToken: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-deep-link', () => ({
  onOpenUrl: vi.fn(),
}));

const { refreshAccessToken } = await import('../api/auth.js');
const { isDesktop } = await import('../lib/platform.js');
const { setRefreshToken } = await import('../lib/secure-storage.js');
const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');

describe('SessionProvider', () => {
  afterEach(() => {
    cleanup();
    useAuthStore.setState({ status: 'idle', user: null });
    vi.resetAllMocks();
    vi.mocked(isDesktop).mockReturnValue(false);
  });

  it('shows a splash while the silent refresh is in flight', () => {
    vi.mocked(refreshAccessToken).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <SessionProvider>
          <p>App content</p>
        </SessionProvider>
      </MemoryRouter>,
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
      <MemoryRouter>
        <SessionProvider>
          <p>App content</p>
        </SessionProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('App content')).toBeDefined();
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('renders children (unauthenticated) once the refresh resolves with no session', async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue(null);

    render(
      <MemoryRouter>
        <SessionProvider>
          <p>App content</p>
        </SessionProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('App content')).toBeDefined();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  describe('desktop deep-link callback', () => {
    const user = {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: '00000000-0000-0000-0000-000000000002',
      email: 'user@example.com',
      displayName: 'User',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    function renderWithRoutes() {
      return render(
        <MemoryRouter initialEntries={['/login']}>
          <SessionProvider>
            <Routes>
              <Route path="/login" element={<p>Login page</p>} />
              <Route path="/dashboard" element={<p>Dashboard page</p>} />
            </Routes>
          </SessionProvider>
        </MemoryRouter>,
      );
    }

    it('persists the refresh token, hydrates the session, and navigates to /dashboard for a valid callback URL', async () => {
      vi.mocked(isDesktop).mockReturnValue(true);
      vi.mocked(refreshAccessToken)
        .mockResolvedValueOnce(null) // initial silent refresh on mount: no stored session yet
        .mockResolvedValueOnce({ accessToken: 'new-token', user });

      let handler: ((urls: string[]) => void) | undefined;
      vi.mocked(onOpenUrl).mockImplementation((cb) => {
        handler = cb;
        return Promise.resolve(() => {});
      });

      renderWithRoutes();
      await screen.findByText('Login page');
      await vi.waitFor(() => expect(handler).toBeDefined());

      handler!(['portfoliohub://auth/callback?refresh_token=one-time-token']);

      expect(await screen.findByText('Dashboard page')).toBeDefined();
      expect(setRefreshToken).toHaveBeenCalledWith('one-time-token');
      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().user).toEqual(user);
    });

    it('ignores a deep-link URL that is not the auth callback', async () => {
      vi.mocked(isDesktop).mockReturnValue(true);
      vi.mocked(refreshAccessToken).mockResolvedValue(null);

      let handler: ((urls: string[]) => void) | undefined;
      vi.mocked(onOpenUrl).mockImplementation((cb) => {
        handler = cb;
        return Promise.resolve(() => {});
      });

      renderWithRoutes();
      await screen.findByText('Login page');
      await vi.waitFor(() => expect(handler).toBeDefined());

      handler!(['portfoliohub://something/else?refresh_token=attacker-token']);

      await screen.findByText('Login page');
      expect(setRefreshToken).not.toHaveBeenCalled();
    });
  });
});
