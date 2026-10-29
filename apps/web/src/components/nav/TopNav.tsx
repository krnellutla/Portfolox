import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Settings } from 'lucide-react';
import { logout } from '../../api/auth.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useCartStore } from '../../stores/cartStore.js';

const STUDIO_NAV_LINKS = [
  { to: '/studio/dashboard', label: 'Dashboard' },
  { to: '/studio/upload', label: 'Upload' },
  { to: '/studio/builder', label: 'Builder' },
  { to: '/studio/analytics', label: 'Analytics' },
  { to: '/studio/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/studio/settings', label: 'Settings', icon: Settings },
] as const;

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const clear = useAuthStore((state) => state.clear);
  const itemCount = useCartStore((state) => state.itemCount);
  const isStudio = location.pathname.startsWith('/studio');

  async function handleLogout() {
    await logout().catch(() => {});
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-line">
      <div className="max-w-shell mx-auto px-8 flex items-center justify-between h-14">
        <NavLink
          to="/"
          className="font-serif text-[21px] font-[600] tracking-[-0.015em] text-ink"
        >
          Krishna Nellutla
        </NavLink>

        {isStudio && (
          <nav className="hidden md:flex items-center gap-1">
            {STUDIO_NAV_LINKS.map(({ to, label, ...rest }) => {
              const Icon = 'icon' in rest ? rest.icon : null;
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-[7px] text-sm font-medium transition-colors duration-150 flex items-center gap-1.5 ${
                      isActive ? 'bg-canvas text-ink' : 'text-ink-3 hover:text-ink hover:bg-canvas'
                    }`
                  }
                >
                  {Icon && <Icon size={14} />}
                  {label}
                </NavLink>
              );
            })}
          </nav>
        )}

        <div className="hidden md:flex items-center gap-2">
          {!isStudio && itemCount > 0 && (
            <NavLink
              to="/cart"
              aria-label={`Cart (${itemCount} items)`}
              className="relative px-3 py-1.5 rounded-[9px] text-sm font-medium text-ink-3 hover:text-ink transition-colors duration-150 flex items-center gap-1.5"
            >
              <ShoppingBag size={16} />
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-ink text-paper font-mono text-[11px] flex items-center justify-center">
                {itemCount}
              </span>
            </NavLink>
          )}
          {isStudio ? (
            <button
              onClick={() => void handleLogout()}
              className="px-4 py-[7px] rounded-[9px] text-sm font-medium text-ink-3 hover:text-ink transition-colors duration-150"
            >
              Sign out
            </button>
          ) : (
            <>
              <NavLink
                to="/client-login"
                className="px-4 py-[7px] rounded-[9px] text-sm font-medium text-ink-3 hover:text-ink transition-colors duration-150"
              >
                Client Login
              </NavLink>
              <NavLink
                to="/login"
                className="px-4 py-[7px] rounded-[9px] text-sm font-semibold bg-ink text-paper hover:opacity-90 transition-opacity duration-150"
              >
                Sign in
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
