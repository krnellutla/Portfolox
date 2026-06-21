import type { ButtonHTMLAttributes } from 'react';

export interface FavoriteButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  active?: boolean;
  onChange?: (active: boolean) => void;
}

export function FavoriteButton({ active = false, onChange, className = '', ...props }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={active}
      onClick={() => onChange?.(!active)}
      className={`flex h-7 w-7 items-center justify-center rounded-full bg-surface/80 transition-colors duration-150 hover:bg-surface ${className}`}
      {...props}
    >
      <span className={`text-sm leading-none ${active ? 'text-negative' : 'text-ink-3'}`}>
        {active ? '♥' : '♡'}
      </span>
    </button>
  );
}
