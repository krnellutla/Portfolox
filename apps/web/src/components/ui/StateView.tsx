import type { ReactNode } from 'react';
import { Spinner } from './Spinner.js';

export type StateViewVariant = 'loading' | 'error' | 'empty';

export interface StateViewProps {
  variant: StateViewVariant;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Mono eyebrow label — for error variant, pass the API error code here */
  eyebrow?: string;
  /** Centers the content in the full viewport instead of an inline block. */
  fullScreen?: boolean;
}

export function StateView({ variant, title, description, action, eyebrow, fullScreen = false }: StateViewProps) {
  const isError = variant === 'error';

  const content =
    variant === 'loading' ? (
      <div
        className="flex flex-col items-center gap-3 text-center"
        role="status"
      >
        <Spinner size="lg" decorative />
        <p className="text-sm font-medium text-muted">{title}</p>
      </div>
    ) : (
      <div className="max-w-[420px] mx-auto text-center py-16 flex flex-col items-center gap-4">
        {eyebrow && (
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted">{eyebrow}</p>
        )}
        <h2
          className={`font-serif text-[22px] font-light tracking-tight ${
            isError ? 'text-negative' : 'text-ink'
          }`}
        >
          {title}
        </h2>
        {description && (
          <p className="text-[15px] text-ink-3 leading-relaxed max-w-sm">{description}</p>
        )}
        {action}
      </div>
    );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">{content}</div>
    );
  }

  return <div className="flex flex-col items-center justify-center">{content}</div>;
}
