-- Migration: 0020_magic_links
-- Creates the magic_links table for one-click email sign-in.

CREATE TABLE IF NOT EXISTS magic_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS magic_links_tenant_email_idx ON magic_links (tenant_id, email);
CREATE INDEX IF NOT EXISTS magic_links_expires_at_idx   ON magic_links (expires_at);

-- Row-Level Security
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links FORCE ROW LEVEL SECURITY;

CREATE POLICY magic_links_tenant_isolation ON magic_links
  USING (tenant_id = current_tenant_id());

-- Application role access (SELECT/INSERT/UPDATE only — no DELETE)
GRANT SELECT, INSERT, UPDATE ON magic_links TO blueflutes_app;
