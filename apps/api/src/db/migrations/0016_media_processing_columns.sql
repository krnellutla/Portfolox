-- Add processing lifecycle columns to media_assets
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS processing_error text,
  ADD COLUMN IF NOT EXISTS processing_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz;
