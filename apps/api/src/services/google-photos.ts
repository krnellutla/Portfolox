import type { PoolClient } from 'pg';
import { AppError } from '../lib/app-error.js';

const GOOGLE_PHOTOS_API = 'https://photoslibrary.googleapis.com/v1';

export interface GoogleAlbumRaw {
  id: string;
  title: string;
  mediaItemsCount?: string;
  coverPhotoBaseUrl?: string;
  productUrl?: string;
}

export interface GoogleMediaItemRaw {
  id: string;
  baseUrl: string;
  filename: string;
  mediaMetadata?: {
    width?: string;
    height?: string;
    creationTime?: string;
  };
}

export interface UpsertGoogleTokensParams {
  tenantId: string;
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scopes: string;
}

/**
 * Upserts Google OAuth tokens for a user (conflict on tenant_id, user_id).
 */
export async function upsertGoogleOauthTokens(
  client: PoolClient,
  params: UpsertGoogleTokensParams,
): Promise<void> {
  await client.query(
    `INSERT INTO google_oauth_tokens (tenant_id, user_id, access_token, refresh_token, expires_at, scopes, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, google_oauth_tokens.refresh_token),
       expires_at = EXCLUDED.expires_at,
       scopes = EXCLUDED.scopes,
       updated_at = now()`,
    [params.tenantId, params.userId, params.accessToken, params.refreshToken, params.expiresAt, params.scopes],
  );
}

export interface StoredGoogleToken {
  accessToken: string;
  expiresAt: Date;
}

/**
 * Retrieves the stored Google access token for a user.
 * Throws a clear error if not found or expired.
 */
export async function getStoredGoogleToken(client: PoolClient, userId: string): Promise<StoredGoogleToken> {
  const result = await client.query<{ access_token: string; expires_at: Date }>(
    'SELECT access_token, expires_at FROM google_oauth_tokens WHERE user_id = $1 LIMIT 1',
    [userId],
  );

  if (result.rows.length === 0) {
    throw AppError.unauthorized('Google Photos not connected — please reconnect via Settings');
  }

  const row = result.rows[0]!;
  if (row.expires_at < new Date()) {
    throw AppError.unauthorized('Google Photos token expired — please reconnect');
  }

  return { accessToken: row.access_token, expiresAt: row.expires_at };
}

/**
 * Fetches the list of albums from the Google Photos API.
 */
export async function fetchGoogleAlbums(accessToken: string): Promise<GoogleAlbumRaw[]> {
  const res = await fetch(`${GOOGLE_PHOTOS_API}/albums`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw AppError.internal(`Google Photos API error: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as { albums?: GoogleAlbumRaw[] };
  return body.albums ?? [];
}

/**
 * Fetches media items for a specific album.
 */
export async function fetchAlbumMediaItems(accessToken: string, albumId: string): Promise<GoogleMediaItemRaw[]> {
  const items: GoogleMediaItemRaw[] = [];
  let pageToken: string | undefined;

  do {
    const body: Record<string, unknown> = { albumId, pageSize: 100 };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(`${GOOGLE_PHOTOS_API}/mediaItems:search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw AppError.internal(`Google Photos API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { mediaItems?: GoogleMediaItemRaw[]; nextPageToken?: string };
    if (data.mediaItems) items.push(...data.mediaItems);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}
