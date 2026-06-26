import { isDesktop } from './platform.js';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', tiff: 'image/tiff', tif: 'image/tiff',
  raw: 'image/x-raw', cr2: 'image/x-canon-cr2', cr3: 'image/x-canon-cr3',
  nef: 'image/x-nikon-nef', arw: 'image/x-sony-arw', dng: 'image/x-adobe-dng',
  orf: 'image/x-olympus-orf', rw2: 'image/x-panasonic-rw2',
};

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function mimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

/**
 * Reads the given file paths from the local filesystem (desktop only) and
 * returns them as File objects compatible with the existing uploadFile() API.
 * Requires `fs:allow-read-file` permission in capabilities/default.json.
 */
export async function readFilesAsBlobs(paths: string[]): Promise<File[]> {
  if (!isDesktop() || paths.length === 0) return [];

  const { readFile } = await import('@tauri-apps/plugin-fs');
  const files: File[] = [];

  for (const path of paths) {
    const bytes = await readFile(path);
    const name = basename(path);
    const type = mimeFromPath(path);
    files.push(new File([bytes], name, { type }));
  }

  return files;
}
