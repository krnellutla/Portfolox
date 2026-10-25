ALTER TABLE nodes
  ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS is_password_protected boolean NOT NULL DEFAULT false;

-- Backfill share_token for existing nodes
UPDATE nodes SET share_token = gen_random_uuid() WHERE share_token IS NULL;

CREATE INDEX IF NOT EXISTS nodes_share_token_idx ON nodes(share_token) WHERE share_token IS NOT NULL;
