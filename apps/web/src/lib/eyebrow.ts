import { useTenantShell } from '../hooks/useTenantShell.js';

/**
 * Returns the eyebrow text, stripping the "NN — " numeric prefix on tenant hosts.
 */
export function useEyebrow(text: string): string {
  const { isTenantHost } = useTenantShell();
  if (!isTenantHost) return text;
  return text.replace(/^\d+\s*—\s*/, '');
}
