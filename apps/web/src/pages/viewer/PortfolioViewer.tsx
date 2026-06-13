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
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight">Portfolio</h1>

        {state.status === 'loading' && <StateView variant="loading" title="Loading…" />}
        {state.status === 'error' && (
          <StateView variant="error" title="Couldn't load this portfolio" description={state.message} />
        )}
        {state.status === 'ready' && <NodeGrid nodes={state.tree} />}
      </div>
    </main>
  );
}
