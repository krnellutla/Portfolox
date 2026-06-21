import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/discover', icon: '◎', label: 'Discover' },
  { to: '/search',   icon: '⌕', label: 'Search' },
  { to: '/community',icon: '◰', label: 'Community' },
  { to: '/portfolio/miracalder', icon: '◐', label: 'Profile' },
] as const;

export function MobileTabBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex md:hidden border-t border-line bg-surface/95 backdrop-blur-sm pb-safe">
      {TABS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              isActive ? 'text-ink' : 'text-ink-3'
            }`
          }
        >
          <span className="text-[20px] leading-none">{icon}</span>
          <span className="font-mono text-[10px] tracking-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
