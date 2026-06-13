import type { NodeTreeItem } from '../../lib/build-tree.js';

const TYPE_LABEL: Record<NodeTreeItem['type'], string> = {
  folder: 'Folder',
  gallery: 'Gallery',
  page: 'Page',
};

export function NodeGrid({ nodes }: { nodes: NodeTreeItem[] }) {
  if (nodes.length === 0) {
    return <p className="text-sm text-slate-400">This portfolio doesn't have any content yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {nodes.map((node) => (
        <article
          key={node.id}
          className="flex aspect-square flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-800/50 p-4 text-center"
        >
          <span className="text-sm font-medium text-slate-100">{node.name}</span>
          <span className="mt-1 text-xs uppercase tracking-wide text-slate-400">{TYPE_LABEL[node.type]}</span>
        </article>
      ))}
    </div>
  );
}
