// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Spinner } from './Spinner.js';

describe('Spinner', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders an accessible status indicator', () => {
    render(<Spinner />);

    expect(screen.getByRole('status', { name: 'Loading' })).toBeDefined();
  });
});
