import type { ReactNode } from 'react';
import { Spinner } from './Spinner.js';

export type StateViewVariant = 'loading' | 'error' | 'empty';

const TITLE_CLASSES: Record<StateViewVariant, string> = {
  loading: 'text-ink',
  error: 'text-negative',
  empty: 'text-ink',
};

export interface StateViewProps {
  variant: StateViewVariant;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Centers the content in the full viewport instead of an inline block. */
  fullScreen?: boolean;
}

export function StateView({ variant, title, description, action, fullScreen = false }: StateViewProps) {
  const content = (
    <div
      className="flex flex-col items-center gap-3 text-center"
      role={variant === 'loading' ? 'status' : undefined}
    >
      {variant === 'loading' && <Spinner size="lg" decorative />}
      <p className={`text-sm font-medium ${TITLE_CLASSES[variant]}`}>{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink">{content}</div>
    );
  }

  return <div className="flex flex-col items-center justify-center py-16 text-ink">{content}</div>;
}
