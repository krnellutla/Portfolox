import type { ButtonHTMLAttributes } from 'react';

const VARIANT_CLASSES = {
  solid: 'rounded-[9px] bg-ink text-paper hover:bg-ink-2',
  outline: 'rounded-[9px] bg-surface border border-field text-ink hover:border-ink',
  ghost: 'rounded-[9px] bg-transparent text-ink-3 hover:bg-canvas',
  pill: 'rounded-[999px] bg-surface border border-field text-ink-3 hover:bg-ink hover:text-paper',
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 px-[18px] py-[11px] text-sm font-semibold ' +
  'transition-[background-color,color,border-color] duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1 ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

export function buttonClasses(variant: ButtonVariant = 'solid', className = ''): string {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`.trim();
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'solid', className = '', ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
