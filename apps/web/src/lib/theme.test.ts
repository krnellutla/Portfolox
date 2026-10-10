// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_THEME, FONT_STACKS, applyTheme, clearTheme } from './theme.js';

afterEach(() => clearTheme());

describe('applyTheme', () => {
  it('sets color CSS custom properties on documentElement', () => {
    applyTheme(DEFAULT_THEME);
    const s = document.documentElement.style;
    expect(s.getPropertyValue('--color-paper')).toBe('#f4f3f0');
    expect(s.getPropertyValue('--color-ink')).toBe('#16150f');
    expect(s.getPropertyValue('--color-accent')).toBe('#c0683f');
    expect(s.getPropertyValue('--color-muted')).toBe('#6b6960');
  });

  it('resolves font tokens to the correct stack strings', () => {
    applyTheme({ ...DEFAULT_THEME, fontHeading: 'spacemono', fontBody: 'system-serif' });
    const s = document.documentElement.style;
    expect(s.getPropertyValue('--font-serif')).toBe(FONT_STACKS['spacemono']);
    expect(s.getPropertyValue('--font-sans')).toBe(FONT_STACKS['system-serif']);
  });

  it('applies a custom color correctly', () => {
    applyTheme({ ...DEFAULT_THEME, colorBg: '#1a2b3c' });
    expect(document.documentElement.style.getPropertyValue('--color-paper')).toBe('#1a2b3c');
  });

  it('clearTheme removes all overrides', () => {
    applyTheme(DEFAULT_THEME);
    clearTheme();
    expect(document.documentElement.style.getPropertyValue('--color-paper')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--font-serif')).toBe('');
  });
});
