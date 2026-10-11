// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StateView } from './StateView.js';

describe('StateView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a loading state with a spinner, announced as a single status region', () => {
    render(<StateView variant="loading" title="Loading…" />);

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Loading…');
  });

  it('renders an error state with a description', () => {
    render(<StateView variant="error" title="Couldn't load this portfolio" description="Network error" />);

    expect(screen.getByText("Couldn't load this portfolio")).toBeDefined();
    expect(screen.getByText('Network error')).toBeDefined();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders an empty state with an action', () => {
    render(<StateView variant="empty" title="Nothing here yet" action={<button>Refresh</button>} />);

    expect(screen.getByText('Nothing here yet')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDefined();
  });

  it('renders an eyebrow above the title for empty/error variants', () => {
    render(<StateView variant="error" title="Failed" eyebrow="ERR_404" />);

    expect(screen.getByText('ERR_404')).toBeDefined();
    expect(screen.getByText('Failed')).toBeDefined();
  });

  it('applies text-negative to error title', () => {
    render(<StateView variant="error" title="Something went wrong" />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.className).toContain('text-negative');
  });

  it('applies text-ink to empty title', () => {
    render(<StateView variant="empty" title="Nothing here" />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.className).toContain('text-ink');
    expect(heading.className).not.toContain('text-negative');
  });
});
