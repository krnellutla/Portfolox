import {
  deleteMediaResponseSchema,
  mediaAssetSchema,
  mediaListResponseSchema,
  presignResponseSchema,
  type DeleteMediaResponse,
  type MediaAsset,
  type MediaListResponse,
  type PresignResponse,
} from '@blueflutes/shared';
import { z } from 'zod';
import { apiFetch, getAccessToken } from './client.js';

const assetStatusResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  variants: z.array(z.object({
    id: z.string(),
    tenantId: z.string(),
    assetId: z.string(),
    variant: z.string(),
    objectKey: z.string(),
    url: z.string(),
    width: z.number(),
    height: z.number(),
    byteSize: z.number(),
    createdAt: z.string(),
  })),
});

// ── Public read (viewer) ──────────────────────────────────────────────────────

export function getNodeMedia(nodeId: string): Promise<MediaListResponse> {
  return apiFetch<MediaListResponse>(
    `/media?nodeId=${encodeURIComponent(nodeId)}`,
    { method: 'GET' },
    mediaListResponseSchema,
  );
}

// ── Admin manage ─────────────────────────────────────────────────────────────

export function getNodeMediaManage(nodeId: string): Promise<MediaListResponse> {
  return apiFetch<MediaListResponse>(
    `/media/manage?nodeId=${encodeURIComponent(nodeId)}`,
    { method: 'GET' },
    mediaListResponseSchema,
  );
}

// ── Upload orchestration ──────────────────────────────────────────────────────

export function presignUpload(body: {
  nodeId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
}): Promise<PresignResponse> {
  return apiFetch<PresignResponse>(
    '/media/presign',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    presignResponseSchema,
  );
}

export function confirmUpload(
  assetId: string,
  body: { width: number; height: number; checksum?: string },
): Promise<MediaAsset> {
  return apiFetch<MediaAsset>(
    `/media/${assetId}/confirm`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    mediaAssetSchema,
  );
}

export type UploadProgressEvent = { loaded: number; total: number };
export type UploadStatus = 'uploading' | 'processing' | 'ready' | 'failed';

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_ROUNDS = 30; // 60 seconds total

async function pollAssetStatus(
  assetId: string,
  onStatusChange?: (status: UploadStatus) => void,
): Promise<void> {
  for (let i = 0; i < POLL_MAX_ROUNDS; i++) {
    await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const res = await apiFetch(
        `/media/${assetId}/status`,
        { method: 'GET' },
        assetStatusResponseSchema,
      );
      if (res.status === 'ready') {
        onStatusChange?.('ready');
        return;
      }
      if (res.status === 'failed') {
        onStatusChange?.('failed');
        return;
      }
    } catch {
      // transient error — keep polling
    }
  }
  // timed out without terminal status — leave as processing
}

export async function uploadFile(
  nodeId: string,
  file: File,
  onProgress?: (e: UploadProgressEvent) => void,
  onStatusChange?: (status: UploadStatus) => void,
): Promise<MediaAsset> {
  const { width, height } = await getImageDimensions(file);

  const { assetId, uploadUrl } = await presignUpload({
    nodeId,
    filename: file.name,
    mimeType: file.type,
    byteSize: file.size,
  });

  onStatusChange?.('uploading');
  await putToStorage(uploadUrl, file, onProgress);

  onStatusChange?.('processing');
  const asset = await confirmUpload(assetId, { width, height });

  await pollAssetStatus(assetId, onStatusChange);

  return asset;
}

// ── Asset management ──────────────────────────────────────────────────────────

export function deleteMedia(id: string): Promise<DeleteMediaResponse> {
  return apiFetch<DeleteMediaResponse>(
    `/media/${id}`,
    { method: 'DELETE' },
    deleteMediaResponseSchema,
  );
}

export function moveMedia(id: string, position: number): Promise<MediaAsset> {
  return apiFetch<MediaAsset>(
    `/media/${id}/move`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position }) },
    mediaAssetSchema,
  );
}

// ── internal helpers ──────────────────────────────────────────────────────────

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    return { width, height };
  } catch {
    // Fallback for environments without createImageBitmap
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read image dimensions'));
      };
      img.src = url;
    });
  }
}

function putToStorage(
  url: string,
  file: File,
  onProgress?: (e: UploadProgressEvent) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress({ loaded: e.loaded, total: e.total });
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Storage PUT failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Storage PUT network error')));
    xhr.addEventListener('abort', () => reject(new Error('Storage PUT aborted')));

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);

    // Forward the access token for self-hosted storage that requires auth
    const token = getAccessToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(file);
  });
}

// Re-export for convenience so consumers can import everything from this module
export { type MediaAsset, type MediaListResponse };

// Validate a raw API response shape at the list level
export const validateMediaList = (data: unknown): MediaListResponse =>
  mediaListResponseSchema.parse(data);
