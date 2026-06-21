import type { HTMLAttributes } from 'react';

export interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {}

export function Eyebrow({ className = '', children, ...props }: EyebrowProps) {
  return (
    <p
      className={`font-mono text-[11px] uppercase tracking-eyebrow text-muted ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}
