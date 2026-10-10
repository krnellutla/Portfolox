import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useUiStore } from '../../stores/ui-store.js';

const NAV_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  `flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-indigo-50 text-indigo-700 font-medium'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

/** Returns up to two uppercase initials from a display name. */
function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar — always visible on desktop, slide-over on mobile */}
      <>
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/20 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-gray-200 bg-white transition-transform md:static md:translate-x-0 md:flex ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } ${!sidebarOpen ? 'md:hidden' : ''}`}
        >
          {/* Sidebar header */}
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4">
            <span className="text-base font-bold tracking-tight text-gray-900">Blueflutes</span>
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
              Beta
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex flex-1 flex-col gap-1 p-3">
            <NavLink to="/dashboard" end className={NAV_LINK_CLASS} onClick={() => setMobileOpen(false)}>
              Overview
            </NavLink>
            <NavLink to="/dashboard/content" className={NAV_LINK_CLASS} onClick={() => setMobileOpen(false)}>
              Content
            </NavLink>
            <NavLink to="/dashboard/theme" className={NAV_LINK_CLASS} onClick={() => setMobileOpen(false)}>
              Theme
            </NavLink>
          </nav>
        </aside>
      </>

      {/* Main column */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => { setMobileOpen(true); toggleSidebar(); }}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5A.75.75 0 012.75 14h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 14.75z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Desktop toggle (keep sidebarOpen state in sync) */}
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={toggleSidebar}
            className="hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:flex"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5A.75.75 0 012.75 14h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 14.75z" clipRule="evenodd" />
            </svg>
          </button>

          {/* User info */}
          <div className="flex items-center gap-3">
            {/* Avatar with initials */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {initials(user?.displayName)}
            </div>
            <span className="hidden text-sm font-medium text-gray-700 sm:block">{user?.displayName}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
