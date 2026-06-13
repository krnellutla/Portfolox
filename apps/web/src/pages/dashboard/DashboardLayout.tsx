import { Outlet, useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useUiStore } from '../../stores/ui-store.js';

export default function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clear);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <aside
        className={`border-r border-slate-800 bg-slate-950 transition-all ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}`}
      >
        <nav className="flex flex-col gap-1 p-4 text-sm">
          <span className="px-2 py-1 font-semibold text-slate-300">PortfolioHub</span>
          <a href="/dashboard" className="rounded px-2 py-1 hover:bg-slate-800">
            Overview
          </a>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded px-2 py-1 text-sm text-slate-400 hover:bg-slate-800"
          >
            ☰
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{user?.displayName}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
