import { useEffect, useState } from 'react';
import type { MediaListResponse } from '@blueflutes/shared';
import { getNodeMedia } from '../../api/media.js';
import { ResponsiveImage } from '../../components/ui/ResponsiveImage.js';
import type { NodeTreeItem } from '../../lib/build-tree.js';

const TYPE_ICON: Record<NodeTreeItem['type'], string> = {
  folder: '📁',
  gallery: '🖼️',
  page: '📄',
};

const TYPE_LABEL: Record<NodeTreeItem['type'], string> = {
  folder: 'Folder',
  gallery: 'Gallery',
  page: 'Page',
};

function CameraPlaceholder() {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-t-xl bg-gray-100">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
        />
      </svg>
    </div>
  );
}

function prefetchVariants(media: MediaListResponse) {
  const asset = media[0];
  if (!asset) return;
  asset.variants
    .filter((v) => v.variant === 'medium' || v.variant === 'large')
    .forEach((v) => {
      if (document.querySelector(`link[rel="prefetch"][href="${v.url}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = v.url;
      document.head.appendChild(link);
    });
}

function GalleryCard({ node }: { node: NodeTreeItem }) {
  const [media, setMedia] = useState<MediaListResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNodeMedia(node.id)
      .then((data) => { if (!cancelled) setMedia(data); })
      .catch(() => { /* silently fall back to placeholder */ });
    return () => { cancelled = true; };
  }, [node.id]);

  const handleMouseEnter = () => {
    if (media && media.length > 0) prefetchVariants(media);
  };

  return (
    <article
      className="group overflow-hidden rounded-xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
      onMouseEnter={handleMouseEnter}
    >
      {media && media.length > 0 ? (
        <div className="relative overflow-hidden aspect-video w-full rounded-t-xl">
          <ResponsiveImage
            asset={media[0]!}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="h-full w-full object-cover"
            alt={node.name}
          />
        </div>
      ) : (
        <CameraPlaceholder />
      )}
      <div className="px-4 py-3">
        <p className="font-semibold text-gray-900">{node.name}</p>
        {media !== null && (
          <p className="text-sm text-gray-500">
            {media.length} photo{media.length === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </article>
  );
}

export function NodeCard({ node }: { node: NodeTreeItem }) {
  if (node.type === 'gallery') {
    return <GalleryCard node={node} />;
  }

  const subtitle =
    node.type === 'folder'
      ? `${node.children.length} item${node.children.length === 1 ? '' : 's'}`
      : TYPE_LABEL[node.type];

  return (
    <article className="group overflow-hidden rounded-xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CameraPlaceholder />
      <div className="px-4 py-3">
        <p className="font-semibold text-gray-900">{node.name}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </article>
  );
}
