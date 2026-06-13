const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
} as const;

export interface SpinnerProps {
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  /** Set when an ancestor already announces the loading state (e.g. StateView). */
  decorative?: boolean;
}

export function Spinner({ size = 'md', className = '', decorative = false }: SpinnerProps) {
  const a11yProps = decorative ? { 'aria-hidden': true } : { role: 'status', 'aria-label': 'Loading' };

  return (
    <span
      {...a11yProps}
      className={`inline-block animate-spin rounded-full border-slate-700 border-t-slate-300 ${SIZE_CLASSES[size]} ${className}`}
    />
  );
}
