-- Allow tenant-name reads during host resolution without requiring
-- app.tenant_id to be set. This mirrors tenant_domains_read_for_resolution:
-- the host lookup already identifies the tenant, so reading that tenant's own
-- name is not a cross-tenant data leak.
-- Postgres OR-s multiple SELECT policies on the same table, so this does not
-- weaken the existing tenant_isolation policy for INSERT/UPDATE/DELETE.
CREATE POLICY tenants_read_for_resolution ON "tenants"
  FOR SELECT
  USING (true);
