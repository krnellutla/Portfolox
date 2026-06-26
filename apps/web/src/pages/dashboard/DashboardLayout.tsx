import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth.js';
import { Button } from '../../components/ui/Button.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useUiStore } from '../../stores/ui-store.js';

const NAV_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1.5 text-sm transition-colors ${
    isActive ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
  }`;

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
        className={`shrink-0 border-r border-slate-800 bg-slate-950 transition-all ${
          sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
        }`}
      >
        <nav className="flex flex-col gap-1 p-4 text-sm">
          <span className="mb-2 px-2 py-1 text-base font-semibold tracking-tight text-slate-100">Blueflutes</span>
          <NavLink to="/dashboard" end className={NAV_LINK_CLASS}>
            Overview
          </NavLink>
          <NavLink to="/dashboard/content" className={NAV_LINK_CLASS}>
            Content
          </NavLink>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <Button variant="ghost" aria-label="Toggle sidebar" onClick={toggleSidebar}>
            ☰
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{user?.displayName}</span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
