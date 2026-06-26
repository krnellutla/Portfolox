import { useEffect, useState } from 'react';
import type { MediaListResponse } from '@portfoliohub/shared';
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

function GalleryCard({ node }: { node: NodeTreeItem }) {
  const [media, setMedia] = useState<MediaListResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNodeMedia(node.id)
      .then((data) => { if (!cancelled) setMedia(data); })
      .catch(() => { /* silently fall back to icon */ });
    return () => { cancelled = true; };
  }, [node.id]);

  if (media && media.length > 0) {
    const first = media[0]!;
    return (
      <article className="group relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <ResponsiveImage
          asset={first}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
          alt={node.name}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent px-3 py-2">
          <span className="text-sm font-medium text-slate-100">{node.name}</span>
          <span className="ml-2 text-xs text-slate-400">{media.length} photo{media.length === 1 ? '' : 's'}</span>
        </div>
      </article>
    );
  }

  return (
    <article className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-800/50 p-4 text-center transition-colors hover:border-slate-700 hover:bg-slate-800">
      <span aria-hidden="true" className="text-2xl">{TYPE_ICON.gallery}</span>
      <span className="text-sm font-medium text-slate-100">{node.name}</span>
      <span className="text-xs uppercase tracking-wide text-slate-400">{TYPE_LABEL.gallery}</span>
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
    <article className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-800/50 p-4 text-center transition-colors hover:border-slate-700 hover:bg-slate-800">
      <span aria-hidden="true" className="text-2xl">
        {TYPE_ICON[node.type]}
      </span>
      <span className="text-sm font-medium text-slate-100">{node.name}</span>
      <span className="text-xs uppercase tracking-wide text-slate-400">{subtitle}</span>
    </article>
  );
}
