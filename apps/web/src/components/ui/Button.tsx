import type { ButtonHTMLAttributes } from 'react';

const VARIANT_CLASSES = {
  primary: 'bg-slate-100 text-slate-900 hover:bg-white',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
  ghost: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100',
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Returns the shared button styling so non-<button> elements (e.g. the OAuth
 * provider links in Login, which must be real <a> tags for the browser
 * navigation that sets the refresh cookie) can match Button's appearance.
 */
export function buttonClasses(variant: ButtonVariant = 'secondary', className = ''): string {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`.trim();
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'secondary', className = '', ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
