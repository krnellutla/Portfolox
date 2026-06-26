import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button.js';
import { StateView } from '../../../components/ui/StateView.js';
import { useNodesStore } from '../../../stores/nodes-store.js';
import { CreateNodeDialog } from './CreateNodeDialog.js';
import { NodeTree } from './NodeTree.js';

export default function GalleryManager() {
  const { nodes, status, error, load, createNode, updateNode, deleteNode, moveNodeOptimistic } =
    useNodesStore();

  const [showCreate, setShowCreate] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'idle') {
      void load();
    }
  }, [status, load]);

  async function handleCreate(
    type: 'folder' | 'gallery' | 'page',
    name: string,
    slug: string,
    parentId: string | null,
  ) {
    await createNode(parentId, type, name, slug);
  }

  async function handleRename(id: string, name: string) {
    try {
      await updateNode(id, name);
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : 'Rename failed');
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this node and all its children?');
    if (!confirmed) return;
    try {
      await deleteNode(id);
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleMove(id: string, targetParentId: string | null, targetPosition: number) {
    try {
      await moveNodeOptimistic(id, targetParentId, targetPosition);
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : 'Move failed');
    }
  }

  if (status === 'loading') {
    return <StateView variant="loading" title="Loading gallery structure…" />;
  }

  if (status === 'error') {
    return (
      <StateView
        variant="error"
        title="Failed to load"
        description={error ?? undefined}
        action={
          <Button onClick={() => void load()} className="mt-4">
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Content</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Manage folders, galleries, and pages. Drag rows to reorder.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New node</Button>
      </div>

      {pendingError && (
        <div className="flex items-center justify-between rounded border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          <span>{pendingError}</span>
          <button
            className="ml-4 text-red-400 hover:text-red-200"
            onClick={() => setPendingError(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2">
        <NodeTree
          nodes={nodes}
          onRename={handleRename}
          onDelete={handleDelete}
          onMove={handleMove}
        />
      </div>

      {showCreate && (
        <CreateNodeDialog
          parentId={null}
          onConfirm={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
