const SIZE_CLASSES = {
  30:  'h-[30px] w-[30px]',
  36:  'h-9 w-9',
  42:  'h-[42px] w-[42px]',
  46:  'h-[46px] w-[46px]',
  72:  'h-[72px] w-[72px]',
  116: 'h-[116px] w-[116px]',
} as const;

const DOT_SIZE_CLASSES = {
  30:  'h-2 w-2',
  36:  'h-2.5 w-2.5',
  42:  'h-2.5 w-2.5',
  46:  'h-3 w-3',
  72:  'h-3 w-3',
  116: 'h-3.5 w-3.5',
} as const;

export type AvatarSize = keyof typeof SIZE_CLASSES;

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  online?: boolean;
  className?: string;
}

export function Avatar({ src, alt = '', size = 42, online = false, className = '' }: AvatarProps) {
  return (
    <span className={`relative inline-flex shrink-0 ${SIZE_CLASSES[size]} ${className}`}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className="h-full w-full rounded-full"
          style={{ background: 'linear-gradient(145deg, #9aa79b, #5f6f63)' }}
          aria-hidden="true"
        />
      )}
      {online && (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-positive ring-2 ring-paper ${DOT_SIZE_CLASSES[size]}`}
        />
      )}
    </span>
  );
}
