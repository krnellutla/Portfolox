-- Migration: 0018_passkeys
-- Creates passkey_credentials and webauthn_challenges tables for WebAuthn/passkey auth.

-- Passkey credentials (one row per registered device per user)
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  credential_id   TEXT         NOT NULL,
  public_key      TEXT         NOT NULL,
  counter         BIGINT       NOT NULL DEFAULT 0,
  device_type     TEXT         NOT NULL DEFAULT 'singleDevice',
  backed_up       BOOLEAN      NOT NULL DEFAULT FALSE,
  transports      TEXT,
  aaguid          TEXT,
  friendly_name   TEXT,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT passkey_credentials_tenant_cred_id_uniq UNIQUE (tenant_id, credential_id)
);

CREATE INDEX IF NOT EXISTS passkey_credentials_user_idx
  ON passkey_credentials (tenant_id, user_id);

-- Ephemeral WebAuthn challenges (5-minute TTL, single-use)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  challenge   TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webauthn_challenges_tenant_user_idx
  ON webauthn_challenges (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS webauthn_challenges_expires_at_idx
  ON webauthn_challenges (expires_at);

-- Row-Level Security for passkey_credentials
ALTER TABLE passkey_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_credentials FORCE ROW LEVEL SECURITY;

CREATE POLICY passkey_credentials_tenant_isolation ON passkey_credentials
  USING (tenant_id = current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON passkey_credentials TO blueflutes_app;

-- Row-Level Security for webauthn_challenges
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges FORCE ROW LEVEL SECURITY;

CREATE POLICY webauthn_challenges_tenant_isolation ON webauthn_challenges
  USING (tenant_id = current_tenant_id());

GRANT SELECT, INSERT, UPDATE ON webauthn_challenges TO blueflutes_app;
