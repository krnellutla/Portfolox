-- Grants for the restricted runtime role (portfoliohub_app).
--
-- The role itself is NOT created here: role creation/password provisioning
-- is an env-driven bootstrap step (see src/scripts/bootstrap-roles.ts) so no
-- secret is committed to this migration. This migration only grants the
-- minimum privileges the runtime pool needs. It assumes the role already
-- exists (the bootstrap script must run before migrations on a fresh DB).
--
-- The runtime role MUST remain NOSUPERUSER / NOBYPASSRLS, or the RLS
-- policies in 0001_rls_policies.sql are silently bypassed.

GRANT USAGE ON SCHEMA public TO portfoliohub_app;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "tenants",
  "tenant_domains",
  "users",
  "tokens",
  "nodes",
  "media_assets"
TO portfoliohub_app;
