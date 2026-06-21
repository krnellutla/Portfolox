import type { ButtonHTMLAttributes } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  onRemove?: () => void;
}

export function Chip({ active = false, onRemove, className = '', children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-[999px] border px-3 py-1.5 text-sm
        transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink
        ${active
          ? 'border-ink bg-ink text-paper'
          : 'border-field bg-surface text-ink-3 hover:border-ink hover:text-ink'
        } ${className}`}
      {...props}
    >
      {children}
      {onRemove && (
        <span
          role="button"
          aria-label="Remove"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="flex h-3.5 w-3.5 items-center justify-center opacity-60 hover:opacity-100"
        >
          ✕
        </span>
      )}
    </button>
  );
}
