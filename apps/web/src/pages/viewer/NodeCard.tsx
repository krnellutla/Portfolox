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

export function NodeCard({ node }: { node: NodeTreeItem }) {
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
