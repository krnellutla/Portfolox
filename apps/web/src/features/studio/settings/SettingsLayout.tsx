import { NavLink, Outlet } from 'react-router-dom';
import { TopNav } from '../../../components/nav/TopNav.js';

const SETTINGS_NAV = [
  { to: '/studio/settings/profile', label: 'Profile' },
  { to: '/studio/settings/branding', label: 'Branding' },
  { to: '/studio/settings/domain', label: 'Domain' },
  { to: '/studio/settings/billing', label: 'Plan & billing' },
  { to: '/studio/settings/notifications', label: 'Notifications' },
] as const;

export default function SettingsLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <TopNav />
      <div className="max-w-shell mx-auto px-8 flex gap-12 py-10">
        {/* Left rail */}
        <aside className="w-[236px] shrink-0">
          <nav className="sticky top-[34px] pb-6 flex flex-col gap-1">
            {SETTINGS_NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-[9px] font-mono text-[12px] transition-colors ${
                    isActive
                      ? 'bg-field-bg text-ink'
                      : 'text-ink-3 hover:text-ink'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <main className="flex-1 max-w-[720px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
