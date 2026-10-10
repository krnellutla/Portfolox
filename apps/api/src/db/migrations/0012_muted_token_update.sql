-- Update color_muted default from v1 (#9a988f) to v2 (#6b6960).
-- Backfill existing rows that still carry the old default.
ALTER TABLE tenant_settings ALTER COLUMN color_muted SET DEFAULT '#6b6960';
UPDATE tenant_settings SET color_muted = '#6b6960' WHERE color_muted = '#9a988f';
