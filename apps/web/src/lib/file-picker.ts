import { isDesktop } from './platform.js';

/**
 * Opens the native file picker on desktop and returns the selected paths.
 * Returns an empty array on web (media upload is Phase 2; this is a stub
 * handler for the desktop file-picker wiring required by Milestone 1.6).
 */
export async function pickFiles(): Promise<string[]> {
  if (!isDesktop()) {
    return [];
  }

  const { open } = await import('@tauri-apps/plugin-dialog');
  const selection = await open({ multiple: true });

  if (!selection) {
    return [];
  }

  return Array.isArray(selection) ? selection : [selection];
}
