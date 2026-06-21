// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button, buttonClasses } from './Button.js';

describe('Button', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a button with the solid variant by default', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button.className).toContain('bg-ink');
  });

  it('applies the requested variant', () => {
    render(<Button variant="outline">Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button.className).toContain('border-field');
  });

  it('applies the ghost variant', () => {
    render(<Button variant="ghost">Menu</Button>);

    const button = screen.getByRole('button', { name: 'Menu' });
    expect(button.className).toContain('bg-transparent');
  });

  it('applies the pill variant', () => {
    render(<Button variant="pill">Filter</Button>);

    const button = screen.getByRole('button', { name: 'Filter' });
    expect(button.className).toContain('rounded-[999px]');
  });

  it('forwards native button attributes', () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole('button', { name: 'Disabled' })).toHaveProperty('disabled', true);
  });
});

describe('buttonClasses', () => {
  it('returns shared styling for non-button elements', () => {
    expect(buttonClasses('solid')).toContain('bg-ink');
    expect(buttonClasses('outline')).toContain('border-field');
    expect(buttonClasses('ghost')).toContain('bg-transparent');
    expect(buttonClasses('pill')).toContain('rounded-[999px]');
  });
});
