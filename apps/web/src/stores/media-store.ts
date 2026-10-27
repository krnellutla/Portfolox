import type { MediaAssetWithVariants, MediaListResponse } from '@blueflutes/shared';
import { create } from 'zustand';
import {
  deleteMedia,
  getNodeMediaManage,
  moveMedia,
  uploadFile,
  type UploadProgressEvent,
  type UploadStatus,
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

      const onProgress = (e: UploadProgressEvent) => {
        const progress = e.total > 0 ? Math.round((e.loaded / e.total) * 100) : 0;
        patchNode(set, nodeId, (prev) => ({
          uploads: prev.uploads.map((u) => (u.id === item.id ? { ...u, progress } : u)),
        }));
      };

      // Wire uploadFile status transitions directly into upload item
      const onStatusChange = (status: UploadStatus) => {
        patchNode(set, nodeId, (prev) => ({
          uploads: prev.uploads.map((u) =>
            u.id === item.id ? { ...u, status } : u,
          ),
        }));
      };

      try {
        const asset = await uploadFile(nodeId, file, onProgress, onStatusChange);

        // Add asset to store immediately (no variants yet)
        patchNode(set, nodeId, (prev) => ({
          assets: prev.assets.some((a) => a.id === asset.id)
            ? prev.assets.map((a) => (a.id === asset.id ? { ...asset, variants: [] } : a))
            : [...prev.assets, { ...asset, variants: [] }],
          uploads: prev.uploads.map((u) =>
            u.id === item.id ? { ...u, assetId: asset.id, progress: 100 } : u,
          ),
        }));

        // Single reload to pick up generated variants
        try {
          const fresh = await getNodeMediaManage(nodeId);
          patchNode(set, nodeId, { assets: fresh });
        } catch {
          // non-fatal — asset already visible in store without variants
        }
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

