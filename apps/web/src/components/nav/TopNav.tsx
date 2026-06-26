import { NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/discover', label: 'Discover' },
  { to: '/search', label: 'Search' },
  { to: '/community', label: 'Community' },
  { to: '/pricing', label: 'Pricing' },
] as const;

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-line">
      <div className="max-w-shell mx-auto px-8 flex items-center justify-between h-14">
        <NavLink
          to="/discover"
          className="font-serif text-[21px] font-[600] tracking-[-0.015em] text-ink"
        >
          Blueflutes
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-[7px] text-sm font-medium transition-colors duration-150 ${
                  isActive ? 'bg-canvas text-ink' : 'text-ink-3 hover:text-ink hover:bg-canvas'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <NavLink
            to="/login"
            className="px-4 py-[7px] rounded-[9px] text-sm font-semibold text-ink-3 hover:text-ink transition-colors duration-150"
          >
            Sign in
          </NavLink>
          <NavLink
            to="/pricing"
            className="px-4 py-[7px] rounded-[9px] bg-ink text-paper text-sm font-semibold hover:bg-ink-2 transition-colors duration-150"
          >
            Get started
          </NavLink>
        </div>
      </div>
    </header>
  );
}
