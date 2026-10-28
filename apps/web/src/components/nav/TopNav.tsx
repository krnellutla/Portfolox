import { NavLink, useLocation } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

const STUDIO_NAV_LINKS = [
  { to: '/studio/dashboard', label: 'Dashboard' },
  { to: '/studio/upload', label: 'Upload' },
  { to: '/studio/analytics', label: 'Analytics' },
  { to: '/studio/orders', label: 'Orders', icon: ShoppingBag },
] as const;

export function TopNav() {
  const location = useLocation();
  const isStudio = location.pathname.startsWith('/studio');

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
        </div>
      </div>
    </header>
  );
}
