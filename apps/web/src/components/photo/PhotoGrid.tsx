import type { ReactNode } from 'react';

const COL_CLASSES = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
} as const;

const GAP_CLASSES = {
  sm: 'gap-3',
  md: 'gap-3.5',
} as const;

export interface PhotoGridProps {
  cols?: keyof typeof COL_CLASSES;
  gap?: keyof typeof GAP_CLASSES;
  children: ReactNode;
  className?: string;
}

export function PhotoGrid({ cols = 4, gap = 'md', children, className = '' }: PhotoGridProps) {
  return (
    <div className={`grid ${COL_CLASSES[cols]} ${GAP_CLASSES[gap]} ${className}`}>
      {children}
    </div>
  );
}
