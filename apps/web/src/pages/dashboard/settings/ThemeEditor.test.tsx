// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ThemeTokens } from '@blueflutes/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/settings.js', () => ({
  getMySettings: vi.fn(),
  updateTheme: vi.fn(),
}));

const { getMySettings, updateTheme } = await import('../../../api/settings.js');
const { qk, queryClient } = await import('../../../lib/query-client.js');
const { default: ThemeEditor } = await import('./ThemeEditor.js');

const THEME: ThemeTokens = {
  colorBg: '#f4f3f0',
  colorInk: '#16150f',
  colorAccent: '#c0683f',
  colorMuted: '#6b6960',
  fontHeading: 'newsreader',
  fontBody: 'hanken',
  galleryLayout: 'grid',
  gridColumns: 5,
};

function renderEditor() {
  queryClient.clear();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeEditor />
    </QueryClientProvider>,
  );
}

describe('ThemeEditor', () => {
  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.resetAllMocks();
  });

  it('loads and renders the current theme', async () => {
    vi.mocked(getMySettings).mockResolvedValue(THEME);

    renderEditor();

    expect(await screen.findByLabelText('Accent')).toHaveProperty('value', '#c0683f');
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveProperty('disabled', true);
    expect(screen.getByText('All changes saved')).toBeDefined();
  });

  it('enables Save once a field changes, and disables it again for an invalid hex', async () => {
    vi.mocked(getMySettings).mockResolvedValue(THEME);
    renderEditor();

    const accentInput = await screen.findByLabelText('Accent');
    fireEvent.change(accentInput, { target: { value: '#123456' } });

    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveProperty('disabled', false);

    fireEvent.change(accentInput, { target: { value: 'not-a-color' } });

    expect(screen.getByText('Must be a 6-digit hex color')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveProperty('disabled', true);
  });

  it('saves only the changed fields and syncs the theme query cache', async () => {
    vi.mocked(getMySettings).mockResolvedValue(THEME);
    const saved: ThemeTokens = { ...THEME, colorAccent: '#123456' };
    vi.mocked(updateTheme).mockResolvedValue(saved);
    renderEditor();

    const accentInput = await screen.findByLabelText('Accent');
    fireEvent.change(accentInput, { target: { value: '#123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await screen.findByText('All changes saved');

    expect(updateTheme).toHaveBeenCalledWith({ colorAccent: '#123456' });
    expect(queryClient.getQueryData(qk.theme())).toEqual(saved);
    expect(queryClient.getQueryData(qk.mySettings())).toEqual(saved);
  });

  it('discards unsaved changes without calling the API', async () => {
    vi.mocked(getMySettings).mockResolvedValue(THEME);
    renderEditor();

    const accentInput = await screen.findByLabelText('Accent');
    fireEvent.change(accentInput, { target: { value: '#123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(await screen.findByLabelText('Accent')).toHaveProperty('value', '#c0683f');
    expect(updateTheme).not.toHaveBeenCalled();
  });
});
