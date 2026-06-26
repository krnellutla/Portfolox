import { isDesktop } from './platform.js';

/**
 * Opens the native file picker on desktop with image/RAW extension filters.
 * Returns selected file paths. Returns empty array on web (web uses
 * the <input type=file> element directly in the upload component).
 */
export async function pickFiles(): Promise<string[]> {
  if (!isDesktop()) {
    return [];
  }

  const { open } = await import('@tauri-apps/plugin-dialog');
  const selection = await open({
    multiple: true,
    filters: [
      {
        name: 'Images',
        extensions: [
          'jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif',
          'raw', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2',
        ],
      },
    ],
  });

  if (!selection) {
    return [];
  }

  return Array.isArray(selection) ? selection : [selection];
}
