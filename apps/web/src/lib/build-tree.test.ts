import type { PublicNode } from '@blueflutes/shared';
import { describe, expect, it } from 'vitest';
import { buildNodeTree } from './build-tree.js';

function makeNode(overrides: Partial<PublicNode>): PublicNode {
  return {
    id: overrides.id ?? 'node-id',
    parentId: overrides.parentId ?? null,
    type: overrides.type ?? 'folder',
    name: overrides.name ?? 'Node',
    slug: overrides.slug ?? 'node',
    position: overrides.position ?? 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('buildNodeTree', () => {
  it('returns an empty array for no nodes', () => {
    expect(buildNodeTree([])).toEqual([]);
  });

  it('builds a flat list of root nodes when none have a parent', () => {
    const nodes = [makeNode({ id: 'a', position: 1 }), makeNode({ id: 'b', position: 0 })];

    const tree = buildNodeTree(nodes);

    expect(tree.map((n) => n.id)).toEqual(['b', 'a']);
    expect(tree[0]?.children).toEqual([]);
  });

  it('nests children under their parent, ordered by position', () => {
    const nodes = [
      makeNode({ id: 'home', position: 0 }),
      makeNode({ id: 'gallery-2', parentId: 'home', type: 'gallery', position: 1 }),
      makeNode({ id: 'gallery-1', parentId: 'home', type: 'gallery', position: 0 }),
    ];

    const tree = buildNodeTree(nodes);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe('home');
    expect(tree[0]?.children.map((n) => n.id)).toEqual(['gallery-1', 'gallery-2']);
  });

  it('treats nodes with a parentId not present in the input as roots', () => {
    const nodes = [makeNode({ id: 'orphan', parentId: 'missing-parent' })];

    const tree = buildNodeTree(nodes);

    expect(tree.map((n) => n.id)).toEqual(['orphan']);
  });
});
