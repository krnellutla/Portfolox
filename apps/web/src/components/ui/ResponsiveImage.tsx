import type { MediaAssetWithVariants } from '@portfoliohub/shared';

interface Props {
  asset: MediaAssetWithVariants;
  sizes?: string;
  className?: string;
  alt?: string;
}

export function ResponsiveImage({ asset, sizes = '100vw', className, alt = '' }: Props) {
  const sorted = [...asset.variants].sort((a, b) => a.width - b.width);

  const srcSet =
    sorted.length > 0 ? sorted.map((v) => `${v.url} ${v.width}w`).join(', ') : undefined;

  const src = sorted.length > 0 ? (sorted[sorted.length - 1]?.url ?? asset.url) : asset.url;

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      width={asset.width ?? undefined}
      height={asset.height ?? undefined}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
