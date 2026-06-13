import { isTauri } from '@tauri-apps/api/core';

/** True when the app is running inside the Tauri desktop shell (vs. a browser). */
export function isDesktop(): boolean {
  return isTauri();
}
