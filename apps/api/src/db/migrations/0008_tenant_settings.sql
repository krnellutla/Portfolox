-- Tenant-level theme and layout settings.  One row per tenant (PK on
-- tenant_id).  All columns carry DB-level defaults so a missing row is
-- equivalent to defaults and the public /theme endpoint can skip an insert
-- until the tenant first customises their settings.

CREATE TABLE "tenant_settings" (
  "tenant_id"      uuid PRIMARY KEY REFERENCES "tenants"("id") ON DELETE CASCADE,
  "color_bg"       text NOT NULL DEFAULT '#f4f3f0',
  "color_ink"      text NOT NULL DEFAULT '#16150f',
  "color_accent"   text NOT NULL DEFAULT '#c0683f',
  "color_muted"    text NOT NULL DEFAULT '#9a988f',
  "font_heading"   text NOT NULL DEFAULT 'newsreader',
  "font_body"      text NOT NULL DEFAULT 'hanken',
  "gallery_layout" text NOT NULL DEFAULT 'grid',
  "grid_columns"   integer NOT NULL DEFAULT 5,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now()
);
