// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { NodeTreeItem } from '../../lib/build-tree.js';
import { NodeGrid } from './NodeGrid.js';

function makeNode(overrides: Partial<NodeTreeItem>): NodeTreeItem {
  return {
    id: 'node-id',
    parentId: null,
    type: 'folder',
    name: 'Node',
    slug: 'node',
    position: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    children: [],
    ...overrides,
  };
}

describe('NodeGrid', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders an empty state when there are no nodes', () => {
    render(<NodeGrid nodes={[]} />);

    expect(screen.getByText('No galleries yet')).toBeDefined();
  });

  it('renders a folder section heading and its child galleries as cards', () => {
    const tree: NodeTreeItem[] = [
      makeNode({
        id: 'home',
        name: 'Home',
        type: 'folder',
        children: [
          makeNode({ id: 'landscapes', name: 'Landscapes', type: 'gallery', parentId: 'home', position: 0 }),
          makeNode({ id: 'portraits', name: 'Portraits', type: 'gallery', parentId: 'home', position: 1 }),
          makeNode({ id: 'street', name: 'Street', type: 'gallery', parentId: 'home', position: 2 }),
        ],
      }),
    ];

    render(<NodeGrid nodes={tree} />);

    expect(screen.getByRole('heading', { name: 'Home' })).toBeDefined();
    expect(screen.getByText('Landscapes')).toBeDefined();
    expect(screen.getByText('Portraits')).toBeDefined();
    expect(screen.getByText('Street')).toBeDefined();
  });

  it('shows an empty-folder message when a folder has no children', () => {
    const tree: NodeTreeItem[] = [makeNode({ id: 'home', name: 'Home', type: 'folder', children: [] })];

    render(<NodeGrid nodes={tree} />);

    expect(screen.getByRole('heading', { name: 'Home' })).toBeDefined();
    expect(screen.getByText('This folder is empty.')).toBeDefined();
  });

  it('renders non-folder root nodes as cards', () => {
    const tree: NodeTreeItem[] = [makeNode({ id: 'page', name: 'About', type: 'page', children: [] })];

    render(<NodeGrid nodes={tree} />);

    expect(screen.getByText('About')).toBeDefined();
    expect(screen.getByText('Page')).toBeDefined();
  });

  it('renders folder sections alongside a grid of non-folder root nodes', () => {
    const tree: NodeTreeItem[] = [
      makeNode({
        id: 'home',
        name: 'Home',
        type: 'folder',
        children: [makeNode({ id: 'landscapes', name: 'Landscapes', type: 'gallery', parentId: 'home', position: 0 })],
      }),
      makeNode({ id: 'page', name: 'About', type: 'page' }),
    ];

    render(<NodeGrid nodes={tree} />);

    expect(screen.getByRole('heading', { name: 'Home' })).toBeDefined();
    expect(screen.getByText('Landscapes')).toBeDefined();
    expect(screen.getByText('About')).toBeDefined();
    expect(screen.getByText('Page')).toBeDefined();
  });
});
