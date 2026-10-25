import type { ReactNode } from 'react';

const RATIO_CLASSES = {
  '1:1':  'aspect-square',
  '4:3':  'aspect-[4/3]',
  '3:2':  'aspect-[3/2]',
  '16:9': 'aspect-video',
} as const;

export type PhotoRatio = keyof typeof RATIO_CLASSES;

export interface PhotoTileProps {
  src?: string;
  alt?: string;
  code?: string;
  ratio?: PhotoRatio;
  placeholderGradient?: string;
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function PhotoTile({
  src,
  alt = '',
  code,
  ratio = '1:1',
  placeholderGradient = 'linear-gradient(145deg, #9aa79b, #5f6f63)',
  action,
  onClick,
  className = '',
}: PhotoTileProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-tile ${RATIO_CLASSES[ratio]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {src ? (
        <>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Transparent overlay intercepts right-click and drag without blocking click events */}
          <span
            className="absolute inset-0 z-[1]"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            aria-hidden="true"
          />
        </>
      ) : (
        <span
          className="absolute inset-0"
          style={{ background: placeholderGradient }}
          aria-hidden="true"
        />
      )}

      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 8px)',
        }}
        aria-hidden="true"
      />

      <span
        className="pointer-events-none absolute inset-0 rounded-tile"
        style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.25)' }}
        aria-hidden="true"
      />

      {action && <span className="absolute right-2 top-2">{action}</span>}

      {code && (
        <span className="absolute bottom-2 left-2 font-mono text-[10px] tracking-label text-white/80">
          {code}
        </span>
      )}
    </div>
  );
}
