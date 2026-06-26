import type { MediaAssetWithVariants, MediaListResponse } from '@blueflutes/shared';
import { create } from 'zustand';
import {
  deleteMedia,
  getNodeMediaManage,
  moveMedia,
  uploadFile,
  type UploadProgressEvent,
} from '../api/media.js';

// ─── upload queue ─────────────────────────────────────────────────────────────

export type UploadItemStatus = 'queued' | 'uploading' | 'processing' | 'ready' | 'failed';

export interface UploadItem {
  id: string;
  filename: string;
  status: UploadItemStatus;
  progress: number;
  error?: string;
  assetId?: string;
}

// ─── per-node state ───────────────────────────────────────────────────────────

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface NodeMediaState {
  assets: MediaAssetWithVariants[];
  status: LoadStatus;
  error: string | null;
  uploads: UploadItem[];
}

// ─── store ────────────────────────────────────────────────────────────────────

interface MediaStoreState {
  byNode: Record<string, NodeMediaState>;

  loadForNode: (nodeId: string) => Promise<void>;
  enqueueUploads: (nodeId: string, files: File[]) => Promise<void>;
  deleteOptimistic: (nodeId: string, assetId: string) => Promise<void>;
  reorderOptimistic: (nodeId: string, assetId: string, targetPosition: number) => Promise<void>;

}

const DEFAULT_NODE_STATE: NodeMediaState = {
  assets: [],
  status: 'idle',
  error: null,
  uploads: [],
};

function getNode(state: MediaStoreState, nodeId: string): NodeMediaState {
  return state.byNode[nodeId] ?? { ...DEFAULT_NODE_STATE };
}

function patchNode(
  set: (fn: (s: MediaStoreState) => Partial<MediaStoreState>) => void,
  nodeId: string,
  patch: Partial<NodeMediaState> | ((prev: NodeMediaState) => Partial<NodeMediaState>),
) {
  set((state) => {
    const prev = getNode(state, nodeId);
    const next = typeof patch === 'function' ? patch(prev) : patch;
    return { byNode: { ...state.byNode, [nodeId]: { ...prev, ...next } } };
  });
}

// Maximum consecutive polls before giving up on a processing asset
const MAX_POLL_ROUNDS = 12;
const POLL_INTERVAL_MS = 3000;

export const useMediaStore = create<MediaStoreState>((set, get) => ({
  byNode: {},

  loadForNode: async (nodeId) => {
    patchNode(set, nodeId, { status: 'loading', error: null });
    try {
      const assets = await getNodeMediaManage(nodeId);
      patchNode(set, nodeId, { assets, status: 'ready' });
    } catch (err) {
      patchNode(set, nodeId, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load media',
      });
    }
  },

  enqueueUploads: async (nodeId, files) => {
    const items: UploadItem[] = files.map((f) => ({
      id: crypto.randomUUID(),
      filename: f.name,
      status: 'queued',
      progress: 0,
    }));

    patchNode(set, nodeId, (prev) => ({ uploads: [...prev.uploads, ...items] }));

    // Sequential upload queue
    for (let i = 0; i < files.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const item = items[i]!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const file = files[i]!;

      // Mark uploading
      patchNode(set, nodeId, (prev) => ({
        uploads: prev.uploads.map((u) => (u.id === item.id ? { ...u, status: 'uploading' } : u)),
      }));

      try {
        const onProgress = (e: UploadProgressEvent) => {
          const progress = e.total > 0 ? Math.round((e.loaded / e.total) * 100) : 0;
          patchNode(set, nodeId, (prev) => ({
            uploads: prev.uploads.map((u) => (u.id === item.id ? { ...u, progress } : u)),
          }));
        };

        const asset = await uploadFile(nodeId, file, onProgress);

        // Mark processing (server is running sharp variants)
        patchNode(set, nodeId, (prev) => ({
          uploads: prev.uploads.map((u) =>
            u.id === item.id ? { ...u, status: 'processing', assetId: asset.id, progress: 100 } : u,
          ),
          assets: [...prev.assets, { ...asset, variants: [] }],
        }));

        // Poll until ready or failed (bounded)
        void pollUntilReady(nodeId, asset.id, set);
      } catch (err) {
        patchNode(set, nodeId, (prev) => ({
          uploads: prev.uploads.map((u) =>
            u.id === item.id
              ? { ...u, status: 'failed', error: err instanceof Error ? err.message : 'Upload failed' }
              : u,
          ),
        }));
      }
    }
  },

  deleteOptimistic: async (nodeId, assetId) => {
    const snapshot = getNode(get(), nodeId).assets;

    patchNode(set, nodeId, (prev) => ({
      assets: prev.assets.filter((a) => a.id !== assetId),
    }));

    try {
      await deleteMedia(assetId);
    } catch {
      // Rollback
      patchNode(set, nodeId, { assets: snapshot });
    }
  },

  reorderOptimistic: async (nodeId, assetId, targetPosition) => {
    const snapshot = getNode(get(), nodeId).assets;

    patchNode(set, nodeId, (prev) => ({
      assets: applyReorderLocally(prev.assets, assetId, targetPosition),
    }));

    try {
      const updated = await moveMedia(assetId, targetPosition);
      // Server response has no variants; update only the position field to avoid wiping variants
      patchNode(set, nodeId, (prev) => ({
        assets: prev.assets.map((a) =>
          a.id === updated.id ? { ...a, position: updated.position } : a,
        ),
      }));
    } catch {
      patchNode(set, nodeId, { assets: snapshot });
    }
  },
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

function applyReorderLocally(
  assets: MediaAssetWithVariants[],
  id: string,
  targetPosition: number,
): MediaAssetWithVariants[] {
  const moving = assets.find((a) => a.id === id);
  if (!moving) return assets;

  const rest = assets.filter((a) => a.id !== id).sort((a, b) => a.position - b.position);
  const clampedPos = Math.min(targetPosition, rest.length);
  rest.splice(clampedPos, 0, moving);
  return rest.map((a, i) => ({ ...a, position: i }));
}

async function pollUntilReady(
  nodeId: string,
  assetId: string,
  set: (fn: (s: MediaStoreState) => Partial<MediaStoreState>) => void,
) {
  for (let round = 0; round < MAX_POLL_ROUNDS; round++) {
    await sleep(POLL_INTERVAL_MS);

    try {
      const assets = await getNodeMediaManage(nodeId);
      const asset = assets.find((a) => a.id === assetId);

      if (!asset || asset.status === 'ready' || asset.status === 'failed') {
        patchNode(set, nodeId, (prev) => {
          const newAssets = asset
            ? prev.assets.map((a) => (a.id === assetId ? asset : a))
            : prev.assets;
          const finalStatus: UploadItemStatus = asset?.status === 'ready' ? 'ready' : 'failed';
          return {
            assets: newAssets,
            uploads: prev.uploads.map((u) =>
              u.assetId === assetId ? { ...u, status: finalStatus } : u,
            ),
          };
        });
        return;
      }
    } catch {
      // network hiccup — keep polling
    }
  }

  // Timed out — surface as failed
  patchNode(set, nodeId, (prev) => ({
    uploads: prev.uploads.map((u) =>
      u.assetId === assetId ? { ...u, status: 'failed', error: 'Processing timed out' } : u,
    ),
  }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
