import type { NodeResponse } from '@portfoliohub/shared';
import { create } from 'zustand';
import { createNode, deleteNode, listNodes, moveNode, updateNode } from '../api/nodes.js';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface NodesState {
  nodes: NodeResponse[];
  status: LoadStatus;
  error: string | null;

  load: () => Promise<void>;
  add: (node: NodeResponse) => void;
  update: (node: NodeResponse) => void;
  remove: (id: string) => void;

  createNode: (
    parentId: string | null,
    type: NodeResponse['type'],
    name: string,
    slug?: string,
  ) => Promise<NodeResponse>;

  updateNode: (id: string, name?: string, slug?: string) => Promise<NodeResponse>;

  deleteNode: (id: string) => Promise<void>;

  moveNodeOptimistic: (
    id: string,
    targetParentId: string | null,
    targetPosition: number,
  ) => Promise<void>;
}

export const useNodesStore = create<NodesState>((set, get) => ({
  nodes: [],
  status: 'idle',
  error: null,

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const nodes = await listNodes();
      set({ nodes, status: 'ready' });
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load nodes' });
    }
  },

  add: (node) => set((state) => ({ nodes: [...state.nodes, node] })),

  update: (node) =>
    set((state) => ({ nodes: state.nodes.map((n) => (n.id === node.id ? node : n)) })),

  remove: (id) => set((state) => ({ nodes: state.nodes.filter((n) => n.id !== id) })),

  createNode: async (parentId, type, name, slug) => {
    const node = await createNode({ parentId, type, name, slug });
    get().add(node);
    return node;
  },

  updateNode: async (id, name, slug) => {
    if (name === undefined && slug === undefined) {
      throw new Error('At least one of name or slug is required');
    }
    const node = await updateNode(id, { name, slug } as { name?: string; slug?: string });
    get().update(node);
    return node;
  },

  deleteNode: async (id) => {
    await deleteNode(id);
    // Also remove any children that were in the local tree
    set((state) => ({
      nodes: state.nodes.filter((n) => !isDescendantOrSelf(n, id, state.nodes)),
    }));
  },

  moveNodeOptimistic: async (id, targetParentId, targetPosition) => {
    const snapshot = get().nodes;

    // Optimistic update: recompute positions for affected groups
    set((state) => ({ nodes: applyMoveLocally(state.nodes, id, targetParentId, targetPosition) }));

    try {
      const updated = await moveNode(id, { parentId: targetParentId, position: targetPosition });
      // Server is authoritative: replace the moved node with server response
      set((state) => ({ nodes: state.nodes.map((n) => (n.id === updated.id ? updated : n)) }));
    } catch {
      // Rollback on failure
      set({ nodes: snapshot });
    }
  },
}));

// ─── helpers ────────────────────────────────────────────────────────────────

function isDescendantOrSelf(
  node: NodeResponse,
  targetId: string,
  allNodes: NodeResponse[],
): boolean {
  if (node.id === targetId) return true;
  if (node.parentId === null) return false;
  const parent = allNodes.find((n) => n.id === node.parentId);
  return parent ? isDescendantOrSelf(parent, targetId, allNodes) : false;
}

function applyMoveLocally(
  nodes: NodeResponse[],
  id: string,
  targetParentId: string | null,
  requestedPosition: number,
): NodeResponse[] {
  const moving = nodes.find((n) => n.id === id);
  if (!moving) return nodes;

  const sourceParentId = moving.parentId;
  const isSameParent =
    sourceParentId === targetParentId ||
    (sourceParentId === null && targetParentId === null);

  if (isSameParent) {
    const siblings = nodes
      .filter((n) => n.parentId === targetParentId && n.id !== id)
      .sort((a, b) => a.position - b.position);
    const clampedPos = Math.min(requestedPosition, siblings.length);

    const reordered = [...siblings];
    reordered.splice(clampedPos, 0, moving);

    const updated = new Map(nodes.map((n) => [n.id, n]));
    reordered.forEach((n, i) => updated.set(n.id, { ...n, position: i }));
    return Array.from(updated.values());
  } else {
    const updated = new Map(nodes.map((n) => [n.id, n]));

    // Compact old group
    const oldSiblings = nodes
      .filter((n) => n.parentId === sourceParentId && n.id !== id)
      .sort((a, b) => a.position - b.position);
    oldSiblings.forEach((n, i) => updated.set(n.id, { ...n, position: i }));

    // Open slot in new group
    const newSiblings = nodes
      .filter((n) => n.parentId === targetParentId)
      .sort((a, b) => a.position - b.position);
    const clampedPos = Math.min(requestedPosition, newSiblings.length);
    const reordered = [...newSiblings];
    reordered.splice(clampedPos, 0, { ...moving, parentId: targetParentId, position: clampedPos });
    reordered.forEach((n, i) => updated.set(n.id, { ...n, position: i }));

    return Array.from(updated.values());
  }
}
