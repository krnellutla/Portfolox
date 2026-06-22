-- RLS policies for media_variants, mirroring the pattern in 0001_rls_policies.sql.
-- tenant_id is denormalized onto media_variants so the same current_tenant_id()
-- keying applies without a join. FORCE ROW LEVEL SECURITY ensures even the
-- table owner (the migration role) is subject to these policies.

ALTER TABLE "media_variants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "media_variants" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "media_variants"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
