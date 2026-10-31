import type { PoolClient } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAlbumMediaItems,
  fetchGoogleAlbums,
  getStoredGoogleToken,
  inferAlbumCategory,
  normalizeGoogleMimeType,
  syncAlbumToTenant,
} from '../../src/services/google-photos.js';

describe('google-photos service & auto-categorization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('inferAlbumCategory', () => {
    it('categorizes albums by title keywords across all supported categories', () => {
      expect(inferAlbumCategory('Singapore Marina Bay Skyline')).toBe('City');
      expect(inferAlbumCategory('San Francisco Trip — B&W')).toBe('B&W');
      expect(inferAlbumCategory('Mahesh & Mansa Family Shoot')).toBe('Family');
      expect(inferAlbumCategory('Deepavali Portraits 2024')).toBe('Portrait');
      expect(inferAlbumCategory('California Road Trip 2024')).toBe('Travel');
      expect(inferAlbumCategory('Golden Hour Sunset at the Beach')).toBe('Landscape');
      expect(inferAlbumCategory('Candid Street Walk')).toBe('Street');
      expect(inferAlbumCategory('New Year Fireworks & Wedding')).toBe('Events');
      expect(inferAlbumCategory('Botanical Gardens Birds & Wildlife')).toBe('Wildlife');
      expect(inferAlbumCategory('Modern Cathedral & Bridge Architecture')).toBe('Architecture');
    });

    it('uses media item filenames and descriptions when album title is generic', () => {
      expect(
        inferAlbumCategory('October Selection', [
          { filename: 'familyshoot-001.jpg' },
          { filename: 'familyshoot-002.jpg' },
        ]),
      ).toBe('Family');

      expect(
        inferAlbumCategory('2024 Selects', [
          { filename: 'IMG_001.jpg', description: 'Black and white street tram' },
          { filename: 'IMG_002.jpg', description: 'Monochrome shadow' },
        ]),
      ).toBe('B&W');
    });

    it('falls back to aspect-ratio heuristics when no keywords match', () => {
      expect(
        inferAlbumCategory('Untitled Session', [
          { filename: 'DSC_0001.JPG', mediaMetadata: { width: '2000', height: '3000' } },
          { filename: 'DSC_0002.JPG', mediaMetadata: { width: '1600', height: '2400' } },
        ]),
      ).toBe('Portrait');

      expect(
        inferAlbumCategory('Untitled Session', [
          { filename: 'DSC_0001.JPG', mediaMetadata: { width: '4000', height: '2600' } },
          { filename: 'DSC_0002.JPG', mediaMetadata: { width: '3840', height: '2160' } },
        ]),
      ).toBe('Landscape');
    });
  });

  describe('normalizeGoogleMimeType', () => {
    it('preserves allowed image MIME types and normalizes unsupported/HEIC to image/jpeg', () => {
      expect(normalizeGoogleMimeType('image/png')).toBe('image/png');
      expect(normalizeGoogleMimeType('image/webp')).toBe('image/webp');
      expect(normalizeGoogleMimeType('image/heic')).toBe('image/jpeg');
      expect(normalizeGoogleMimeType(undefined)).toBe('image/jpeg');
    });
  });

  describe('fetchGoogleAlbums & fetchAlbumMediaItems', () => {
    it('paginates through all album pages and defaults missing titles', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              albums: [{ id: 'a1', title: 'Marina Bay', mediaItemsCount: '5' }],
              nextPageToken: 'page-2',
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              albums: [{ id: 'a2', title: '' }],
            }),
            { status: 200 },
          ),
        );

      const albums = await fetchGoogleAlbums('tok-123');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(albums).toEqual([
        {
          id: 'a1',
          title: 'Marina Bay',
          mediaItemsCount: '5',
          coverPhotoBaseUrl: undefined,
          productUrl: undefined,
        },
        {
          id: 'a2',
          title: 'Untitled Album',
          mediaItemsCount: undefined,
          coverPhotoBaseUrl: undefined,
          productUrl: undefined,
        },
      ]);
    });

    it('filters out video items when fetching album media items', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            mediaItems: [
              {
                id: 'm1',
                baseUrl: 'https://lh3.googleusercontent.com/p1',
                filename: 'IMG_1.jpg',
                mimeType: 'image/jpeg',
              },
              {
                id: 'm2',
                baseUrl: 'https://lh3.googleusercontent.com/v1',
                filename: 'VID_1.mp4',
                mimeType: 'video/mp4',
                mediaMetadata: { video: { status: 'READY' } },
              },
            ],
          }),
          { status: 200 },
        ),
      );

      const items = await fetchAlbumMediaItems('tok-123', 'album-1');
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe('m1');
    });
  });

  describe('getStoredGoogleToken', () => {
    it('returns stored access token when not expired', async () => {
      const future = new Date(Date.now() + 3600_000);
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({
          rows: [{ access_token: 'valid-token', refresh_token: 'ref-1', expires_at: future }],
        }),
      } as unknown as PoolClient;

      const res = await getStoredGoogleToken(mockClient, 'user-1');
      expect(res.accessToken).toBe('valid-token');
    });
  });

  describe('syncAlbumToTenant', () => {
    it('creates category folder, creates gallery node under it, and inserts new media items', async () => {
      const queries: { sql: string; params: unknown[] }[] = [];
      const mockClient = {
        query: vi.fn(async (sql: string, params: unknown[] = []) => {
          queries.push({ sql, params });
          if (sql.includes("AND type = 'folder'")) {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('INSERT INTO nodes (tenant_id, parent_id, type, name, slug, position)') && sql.includes("'folder'")) {
            return { rows: [{ id: 'folder-family-id' }], rowCount: 1 };
          }
          if (sql.includes('WHERE tenant_id = $1 AND google_album_id = $2')) {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes("INSERT INTO nodes (tenant_id, parent_id, type, name, slug, position, google_album_id)")) {
            return { rows: [{ id: 'gallery-node-id' }], rowCount: 1 };
          }
          if (sql.includes('SELECT COALESCE(MAX(position), -1) + 1 AS next_pos')) {
            return { rows: [{ next_pos: 0 }], rowCount: 1 };
          }
          if (sql.includes('SELECT id FROM media_assets WHERE tenant_id = $1 AND google_media_item_id = $2')) {
            return { rows: [], rowCount: 0 };
          }
          return { rows: [], rowCount: 0 };
        }),
      } as unknown as PoolClient;

      const result = await syncAlbumToTenant(mockClient, {
        tenantId: 'tenant-1',
        album: { id: 'g-album-1', title: 'Mahesh Family Session' },
        mediaItems: [
          {
            id: 'g-item-1',
            baseUrl: 'https://lh3.googleusercontent.com/photo1',
            filename: 'family_01.jpg',
            mimeType: 'image/jpeg',
            mediaMetadata: { width: '1600', height: '1200' },
          },
        ],
      });

      expect(result).toEqual({
        galleryNodeId: 'gallery-node-id',
        category: 'Family',
        synced: 1,
        skipped: 0,
      });

      const galleryInsert = queries.find((q) =>
        q.sql.includes("INSERT INTO nodes (tenant_id, parent_id, type, name, slug, position, google_album_id)"),
      );
      expect(galleryInsert?.params[1]).toBe('folder-family-id');
    });
  });
});

