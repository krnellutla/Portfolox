-- RLS policies for tenant_settings, mirroring 0001_rls_policies.sql and
-- 0004_media_variants_rls.sql.  FORCE ROW LEVEL SECURITY ensures the
-- migration role (table owner) is also subject to policies.

ALTER TABLE "tenant_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tenant_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "tenant_settings"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
