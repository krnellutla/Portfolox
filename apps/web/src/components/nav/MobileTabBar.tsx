import { NavLink, useLocation } from 'react-router-dom';

const PORTFOLIO_TABS = [
  { href: '#work',    icon: '◫', label: 'Work' },
  { href: '#about',   icon: '◐', label: 'About' },
  { href: '#contact', icon: '◉', label: 'Contact' },
] as const;

const STUDIO_TABS = [
  { to: '/studio/dashboard', icon: '◎', label: 'Dashboard' },
  { to: '/studio/upload',    icon: '⊕', label: 'Upload' },
  { to: '/studio/analytics', icon: '◈', label: 'Analytics' },
] as const;

export function MobileTabBar() {
  const { pathname } = useLocation();
  const isPortfolio = pathname === '/' || pathname.startsWith('/p/');
  const isStudio = pathname.startsWith('/studio');

  // Only render on portfolio and studio routes
  if (!isPortfolio && !isStudio) return null;

  if (isPortfolio) {
    return (
      <nav className="fixed bottom-0 inset-x-0 z-40 flex md:hidden border-t border-white/[0.08] bg-[#0c0b08]/95 backdrop-blur-sm pb-safe">
        {PORTFOLIO_TABS.map(({ href, icon, label }) => (
          <a
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-white/40 hover:text-white/70 transition-colors"
          >
            <span className="text-[20px] leading-none">{icon}</span>
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase">{label}</span>
          </a>
        ))}
        <a
          href="/login"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-white/20 hover:text-white/50 transition-colors"
        >
          <span className="text-[20px] leading-none">⊞</span>
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase">Admin</span>
        </a>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex md:hidden border-t border-line bg-surface/95 backdrop-blur-sm pb-safe">
      {STUDIO_TABS.map(({ to, icon, label }) => (
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
