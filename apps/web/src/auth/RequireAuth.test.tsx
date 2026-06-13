// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../stores/auth-store.js';
import { RequireAuth } from './RequireAuth.js';

function renderWithGuard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<p>Dashboard content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  afterEach(() => {
    cleanup();
    useAuthStore.setState({ status: 'idle', user: null });
  });

  it('renders the protected route when authenticated', () => {
    useAuthStore.setState({ status: 'authenticated' });

    renderWithGuard();

    expect(screen.getByText('Dashboard content')).toBeDefined();
  });

  it('redirects to /login when unauthenticated', () => {
    useAuthStore.setState({ status: 'unauthenticated' });

    renderWithGuard();

    expect(screen.getByText('Login page')).toBeDefined();
  });

  it('redirects to /login while the session is loading', () => {
    useAuthStore.setState({ status: 'loading' });

    renderWithGuard();

    expect(screen.getByText('Login page')).toBeDefined();
  });
});
