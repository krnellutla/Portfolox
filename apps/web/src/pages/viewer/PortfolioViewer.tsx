import { useEffect, useState } from 'react';
import { listNodes } from '../../api/nodes.js';
import { ApiError } from '../../api/client.js';
import { StateView } from '../../components/ui/StateView.js';
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
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 border-b border-gray-100 pb-8">
          <h1 className="text-3xl font-light tracking-tight text-gray-900">Portfolio</h1>
        </header>

        {state.status === 'loading' && <StateView variant="loading" title="Loading…" />}
        {state.status === 'error' && (
          <StateView variant="error" title="This portfolio isn't available right now." description={state.message} />
        )}
        {state.status === 'ready' && <NodeGrid nodes={state.tree} />}
      </div>
    </main>
  );
}
