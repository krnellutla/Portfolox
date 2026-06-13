import { StateView } from '../../components/ui/StateView.js';
import type { NodeTreeItem } from '../../lib/build-tree.js';
import { NodeCard } from './NodeCard.js';

const CARD_GRID_CLASS = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4';

export function NodeGrid({ nodes }: { nodes: NodeTreeItem[] }) {
  if (nodes.length === 0) {
    return (
      <StateView variant="empty" title="Nothing here yet" description="This portfolio doesn't have any content yet." />
    );
  }

  const folders = nodes.filter((node) => node.type === 'folder');
  const others = nodes.filter((node) => node.type !== 'folder');

  return (
    <div className="flex flex-col gap-10">
      {folders.map((folder) => (
        <section key={folder.id} aria-labelledby={`folder-heading-${folder.id}`}>
          <h2 id={`folder-heading-${folder.id}`} className="mb-4 text-lg font-semibold text-slate-100">
            {folder.name}
          </h2>
          {folder.children.length > 0 ? (
            <div className={CARD_GRID_CLASS}>
              {folder.children.map((child) => (
                <NodeCard key={child.id} node={child} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">This folder is empty.</p>
          )}
        </section>
      ))}

      {others.length > 0 && (
        <div className={CARD_GRID_CLASS}>
          {others.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}
