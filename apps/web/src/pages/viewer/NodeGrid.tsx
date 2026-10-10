import { StateView } from '../../components/ui/StateView.js';
import type { NodeTreeItem } from '../../lib/build-tree.js';
import { NodeCard } from './NodeCard.js';

const CARD_GRID_CLASS = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3';

export function NodeGrid({ nodes }: { nodes: NodeTreeItem[] }) {
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-4 h-16 w-16 text-gray-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <p className="text-base font-medium text-gray-400">No galleries yet</p>
      </div>
    );
  }

  const folders = nodes.filter((node) => node.type === 'folder');
  const others = nodes.filter((node) => node.type !== 'folder');

  return (
    <div className="flex flex-col gap-12">
      {folders.map((folder) => (
        <section key={folder.id} aria-labelledby={`folder-heading-${folder.id}`}>
          <h2 id={`folder-heading-${folder.id}`} className="mb-5 text-lg font-semibold text-gray-900">
            {folder.name}
          </h2>
          {folder.children.length > 0 ? (
            <div className={CARD_GRID_CLASS}>
              {folder.children.map((child) => (
                <NodeCard key={child.id} node={child} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">This folder is empty.</p>
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
