import { useEffect, useState } from 'react';
import { listNodes } from '../../api/nodes.js';
import { ApiError } from '../../api/client.js';
import { buildNodeTree, type NodeTreeItem } from '../../lib/build-tree.js';
import { NodeGrid } from './NodeGrid.js';

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tree: NodeTreeItem[] };

export default function PortfolioViewer() {
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    listNodes()
      .then((nodes) => {
        if (!cancelled) setState({ status: 'ready', tree: buildNodeTree(nodes) });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : 'Failed to load portfolio.';
        setState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 p-6 text-slate-100">
      <h1 className="mb-6 text-xl font-semibold">Portfolio</h1>

      {state.status === 'loading' && <p className="text-sm text-slate-400">Loading…</p>}
      {state.status === 'error' && <p className="text-sm text-red-400">{state.message}</p>}
      {state.status === 'ready' && <NodeGrid nodes={state.tree} />}
    </main>
  );
}
