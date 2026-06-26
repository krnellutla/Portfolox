import type { NodeResponse } from '@portfoliohub/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── mock the API module ─────────────────────────────────────────────────────

vi.mock('../api/nodes.js', () => ({
  listNodes: vi.fn(),
  createNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
  moveNode: vi.fn(),
}));

import * as nodesApi from '../api/nodes.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<NodeResponse> & Pick<NodeResponse, 'id'>): NodeResponse {
  return {
    parentId: null,
    type: 'gallery',
    name: overrides.id,
    slug: overrides.id,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Re-import the store after mocking so we get a fresh instance each test via reset
async function getStore() {
  // Dynamic import to get a fresh module with the mock in place
  const { useNodesStore } = await import('./nodes-store.js');
  return useNodesStore;
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('useNodesStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('load', () => {
    it('populates nodes on success', async () => {
      const nodes = [makeNode({ id: 'n1', position: 0 }), makeNode({ id: 'n2', position: 1 })];
      vi.mocked(nodesApi.listNodes).mockResolvedValue(nodes);

      const useNodesStore = (await getStore());
      const store = useNodesStore.getState();
      await store.load();

      expect(useNodesStore.getState().status).toBe('ready');
      expect(useNodesStore.getState().nodes).toHaveLength(2);
    });

    it('sets error status on failure', async () => {
      vi.mocked(nodesApi.listNodes).mockRejectedValue(new Error('network'));

      const useNodesStore = (await getStore());
      await useNodesStore.getState().load();

      expect(useNodesStore.getState().status).toBe('error');
      expect(useNodesStore.getState().error).toBe('network');
    });
  });

  describe('deleteNode', () => {
    it('removes the node and its descendants from local state', async () => {
      vi.mocked(nodesApi.deleteNode).mockResolvedValue({ id: 'parent' });

      const useNodesStore = (await getStore());
      useNodesStore.setState({
        nodes: [
          makeNode({ id: 'parent', position: 0 }),
          makeNode({ id: 'child', parentId: 'parent', position: 0 }),
          makeNode({ id: 'grandchild', parentId: 'child', position: 0 }),
          makeNode({ id: 'other', position: 1 }),
        ],
      });

      await useNodesStore.getState().deleteNode('parent');

      const ids = useNodesStore.getState().nodes.map((n) => n.id);
      expect(ids).toEqual(['other']);
    });
  });

  describe('moveNodeOptimistic (same parent)', () => {
    it('reorders nodes optimistically before server confirms', async () => {
      let resolveMove!: (v: NodeResponse) => void;
      const serverPromise = new Promise<NodeResponse>((res) => { resolveMove = res; });
      vi.mocked(nodesApi.moveNode).mockReturnValue(serverPromise);

      const useNodesStore = (await getStore());
      useNodesStore.setState({
        nodes: [
          makeNode({ id: 'a', position: 0 }),
          makeNode({ id: 'b', position: 1 }),
          makeNode({ id: 'c', position: 2 }),
        ],
      });

      const movePromise = useNodesStore.getState().moveNodeOptimistic('a', null, 2);

      // Optimistic update should be visible immediately
      const optimisticOrder = useNodesStore.getState().nodes
        .sort((x, y) => x.position - y.position)
        .map((n) => n.id);
      expect(optimisticOrder).toEqual(['b', 'c', 'a']);

      // Resolve server response
      const updated = makeNode({ id: 'a', position: 2 });
      resolveMove(updated);
      await movePromise;

      // After server, 'a' should have the server-authoritative position
      const aNode = useNodesStore.getState().nodes.find((n) => n.id === 'a');
      expect(aNode?.position).toBe(2);
    });

    it('rolls back to pre-move snapshot on server error', async () => {
      vi.mocked(nodesApi.moveNode).mockRejectedValue(new Error('conflict'));

      const useNodesStore = (await getStore());
      const original = [
        makeNode({ id: 'a', position: 0 }),
        makeNode({ id: 'b', position: 1 }),
        makeNode({ id: 'c', position: 2 }),
      ];
      useNodesStore.setState({ nodes: original });

      await useNodesStore.getState().moveNodeOptimistic('a', null, 2);

      const order = useNodesStore.getState().nodes
        .sort((x, y) => x.position - y.position)
        .map((n) => n.id);
      expect(order).toEqual(['a', 'b', 'c']);
    });
  });

  describe('moveNodeOptimistic (cross parent)', () => {
    it('compacts source group and opens slot in target group', async () => {
      const useNodesStore = (await getStore());
      const movedNode = makeNode({ id: 'child1', parentId: 'folderA', position: 0 });
      vi.mocked(nodesApi.moveNode).mockResolvedValue({ ...movedNode, parentId: 'folderB', position: 0 });

      useNodesStore.setState({
        nodes: [
          makeNode({ id: 'folderA', position: 0 }),
          makeNode({ id: 'folderB', position: 1 }),
          movedNode,
          makeNode({ id: 'child2', parentId: 'folderA', position: 1 }),
        ],
      });

      await useNodesStore.getState().moveNodeOptimistic('child1', 'folderB', 0);

      const finalNodes = useNodesStore.getState().nodes;
      const folderAChildren = finalNodes
        .filter((n) => n.parentId === 'folderA')
        .sort((a, b) => a.position - b.position);
      const folderBChildren = finalNodes
        .filter((n) => n.parentId === 'folderB')
        .sort((a, b) => a.position - b.position);

      expect(folderAChildren.map((n) => n.id)).toEqual(['child2']);
      expect(folderAChildren[0].position).toBe(0);
      expect(folderBChildren.map((n) => n.id)).toEqual(['child1']);
      expect(folderBChildren[0].position).toBe(0);
    });
  });
});
