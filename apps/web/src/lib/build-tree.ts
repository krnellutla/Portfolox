import type { PublicNode } from '@blueflutes/shared';

export interface NodeTreeItem extends PublicNode {
  children: NodeTreeItem[];
}

/**
 * Turns a flat adjacency-list node array into a tree. Nodes whose parentId
 * doesn't reference another node in the array (root nodes, or orphans whose
 * parent wasn't returned) become top-level entries.
 */
export function buildNodeTree(nodes: PublicNode[]): NodeTreeItem[] {
  const byId = new Map<string, NodeTreeItem>();
  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] });
  }

  const roots: NodeTreeItem[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const byPosition = (a: NodeTreeItem, b: NodeTreeItem) => a.position - b.position;
  for (const node of byId.values()) {
    node.children.sort(byPosition);
  }
  roots.sort(byPosition);

  return roots;
}
