import { useState } from 'react';
import type { MediaAssetWithVariants } from '@blueflutes/shared';

interface Props {
  asset: MediaAssetWithVariants;
  sizes?: string;
  className?: string;
  alt?: string;
}

export function ResponsiveImage({ asset, sizes = '100vw', className, alt = '' }: Props) {
  const [loaded, setLoaded] = useState(false);
  const sorted = [...asset.variants].sort((a, b) => a.width - b.width);
  const thumb = sorted[0];

  const srcSet =
    sorted.length > 0 ? sorted.map((v) => `${v.url} ${v.width}w`).join(', ') : undefined;

  const src = sorted.length > 0 ? (sorted[sorted.length - 1]?.url ?? asset.url) : asset.url;

  const blockSave = (e: React.MouseEvent | React.DragEvent) => e.preventDefault();
  const baseClass = `photo-protected${className ? ` ${className}` : ''}`;
  const showLqip = Boolean(thumb && !loaded);

  return (
    <>
      {/* Main image — first in DOM so document.querySelector('img') returns this */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        width={asset.width ?? undefined}
        height={asset.height ?? undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onContextMenu={blockSave}
        onDragStart={blockSave}
        onLoad={() => setLoaded(true)}
        style={
          showLqip
            ? { position: 'relative', zIndex: 1, opacity: 0, transition: 'opacity 0.4s ease' }
            : { position: 'relative', zIndex: 1, opacity: 1, transition: 'opacity 0.4s ease' }
        }
        className={baseClass}
      />
      {/* Blurred LQIP placeholder — sits behind main image via z-index */}
      {showLqip && (
        <img
          src={thumb!.url}
          aria-hidden="true"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(12px)',
            transform: 'scale(1.05)',
            zIndex: 0,
          }}
        />
      )}
    </>
  );
}
