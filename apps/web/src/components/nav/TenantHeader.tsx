import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore.js';
import { useAuthStore } from '../../stores/auth-store.js';

const NAV_LINKS = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
] as const;

interface TenantHeaderProps {
  studioName?: string;
}

export function TenantHeader({ studioName }: TenantHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const itemCount = useCartStore((s) => s.itemCount);
  const name = studioName ?? user?.displayName ?? 'Studio';

  return (
    <header className="sticky top-0 z-40 h-14 bg-paper border-b border-line flex items-center">
      <div className="w-full max-w-shell mx-auto px-8 flex items-center justify-between">
        {/* Studio name */}
        <span className="font-serif font-medium text-[18px] text-ink">{name}</span>

        {/* Gallery nav links + cart */}
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-5">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="font-mono text-[12px] text-ink-3 hover:text-ink transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Cart icon */}
          <Link to="/cart" className="relative text-ink-3 hover:text-ink transition-colors">
            <ShoppingCart size={18} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-ink text-paper font-mono text-[9px] flex items-center justify-center px-[3px]">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
