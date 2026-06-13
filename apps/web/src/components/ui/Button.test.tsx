// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button, buttonClasses } from './Button.js';

describe('Button', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a button with the secondary variant by default', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button.className).toContain('bg-slate-800');
  });

  it('applies the requested variant', () => {
    render(<Button variant="primary">Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button.className).toContain('bg-slate-100');
  });

  it('forwards native button attributes', () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole('button', { name: 'Disabled' })).toHaveProperty('disabled', true);
  });
});

describe('buttonClasses', () => {
  it('returns shared styling for non-button elements', () => {
    expect(buttonClasses('primary')).toContain('bg-slate-100');
    expect(buttonClasses('ghost')).toContain('bg-transparent');
  });
});
