import type { ThemeTokens } from '@portfoliohub/shared';

// Maps font token enum values to CSS font-family stacks.
// Restricted to already-bundled or system fonts — no remote @font-face needed.
export const FONT_STACKS: Record<string, string> = {
  newsreader: "'Newsreader', Georgia, serif",
  hanken: "'Hanken Grotesk', system-ui, sans-serif",
  spacemono: "'Space Mono', ui-monospace, monospace",
  'system-serif': 'Georgia, Cambria, serif',
  'system-sans': 'system-ui, -apple-system, sans-serif',
};

export const DEFAULT_THEME: ThemeTokens = {
  colorBg: '#f4f3f0',
  colorInk: '#16150f',
  colorAccent: '#c0683f',
  colorMuted: '#9a988f',
  fontHeading: 'newsreader',
  fontBody: 'hanken',
  galleryLayout: 'grid',
  gridColumns: 5,
};

// Applies theme tokens as CSS custom properties on :root.
// CSP-safe: sets DOM style properties directly, no <style> element created.
// Unknown font tokens are silently skipped to guard against a tampered response.
export function applyTheme(tokens: ThemeTokens): void {
  const root = document.documentElement;
  root.style.setProperty('--color-paper', tokens.colorBg);
  root.style.setProperty('--color-ink', tokens.colorInk);
  root.style.setProperty('--color-accent', tokens.colorAccent);
  root.style.setProperty('--color-muted', tokens.colorMuted);

  const headingStack = FONT_STACKS[tokens.fontHeading];
  if (headingStack) root.style.setProperty('--font-serif', headingStack);

  const bodyStack = FONT_STACKS[tokens.fontBody];
  if (bodyStack) root.style.setProperty('--font-sans', bodyStack);

  // galleryLayout and gridColumns are consumed by gallery components, not CSS vars
}

export function clearTheme(): void {
  const root = document.documentElement;
  for (const prop of ['--color-paper', '--color-ink', '--color-accent', '--color-muted', '--font-serif', '--font-sans']) {
    root.style.removeProperty(prop);
  }
}
