-- Row-Level Security policies, keyed on the per-transaction setting
-- "app.tenant_id" (see src/db/with-tenant.ts). Policies are written to FAIL
-- CLOSED: if app.tenant_id is unset or empty, current_tenant_id() evaluates
-- to NULL, and NULL = <anything> is never true, so no rows match.
--
-- FORCE ROW LEVEL SECURITY ensures even the table owner (the migration role)
-- is subject to these policies, so RLS cannot be silently bypassed by
-- running queries as the owner.

CREATE FUNCTION current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;
--> statement-breakpoint

-- tenants: a tenant may only see its own row (keyed on id, not tenant_id).
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "tenants"
  USING ("id" = current_tenant_id())
  WITH CHECK ("id" = current_tenant_id());
--> statement-breakpoint

-- tenant_domains: resolution metadata. The tenant-resolution middleware
-- (Milestone 1.3) must look up a tenant by host BEFORE any tenant context
-- exists, so reads are permitted regardless of app.tenant_id. Writes still
-- require the row's tenant_id to match the current tenant context.
ALTER TABLE "tenant_domains" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tenant_domains" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_domains_read_for_resolution ON "tenant_domains"
  FOR SELECT
  USING (true);
--> statement-breakpoint
CREATE POLICY tenant_domains_write_isolation ON "tenant_domains"
  FOR INSERT
  WITH CHECK ("tenant_id" = current_tenant_id());
--> statement-breakpoint
CREATE POLICY tenant_domains_update_isolation ON "tenant_domains"
  FOR UPDATE
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
--> statement-breakpoint
CREATE POLICY tenant_domains_delete_isolation ON "tenant_domains"
  FOR DELETE
  USING ("tenant_id" = current_tenant_id());
--> statement-breakpoint

-- users, tokens, nodes, media_assets: standard tenant_id isolation.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "users"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
--> statement-breakpoint

ALTER TABLE "tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tokens" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "tokens"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
--> statement-breakpoint

ALTER TABLE "nodes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "nodes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "nodes"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
--> statement-breakpoint

ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "media_assets" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "media_assets"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
