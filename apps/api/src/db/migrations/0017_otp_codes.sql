-- Migration: 0017_otp_codes
-- Creates the otp_codes table for email-based OTP authentication.

CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  attempts    INTEGER NOT NULL DEFAULT 0,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_codes_tenant_email_idx ON otp_codes (tenant_id, email);
CREATE INDEX IF NOT EXISTS otp_codes_expires_at_idx   ON otp_codes (expires_at);

-- Row-Level Security
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes FORCE ROW LEVEL SECURITY;

CREATE POLICY otp_codes_tenant_isolation ON otp_codes
  USING (tenant_id = current_tenant_id());

-- Application role access (blueflutes_app needs SELECT/INSERT/UPDATE only — no DELETE)
GRANT SELECT, INSERT, UPDATE ON otp_codes TO blueflutes_app;
