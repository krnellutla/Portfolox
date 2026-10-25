-- Store Google OAuth tokens per user (one row per user, upsert on re-auth)
CREATE TABLE google_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  scopes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

-- Add Google-specific columns to nodes (to track which album a gallery came from)
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS google_album_id text;

-- Add Google-specific columns to media_assets (for cache-on-access in M2)
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS google_media_item_id text,
  ADD COLUMN IF NOT EXISTS google_base_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS cached_url text,
  ADD COLUMN IF NOT EXISTS cached_until timestamptz;

-- Index for album lookup
CREATE INDEX IF NOT EXISTS nodes_google_album_id_idx ON nodes(google_album_id) WHERE google_album_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_assets_google_item_id_idx ON media_assets(google_media_item_id) WHERE google_media_item_id IS NOT NULL;

-- RLS: google_oauth_tokens is tenant-scoped
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY google_oauth_tokens_tenant_isolation ON google_oauth_tokens
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
GRANT ALL ON google_oauth_tokens TO blueflutes_app;
