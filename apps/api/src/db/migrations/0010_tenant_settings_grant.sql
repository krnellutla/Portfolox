-- Grant DML on tenant_settings to the restricted runtime role.
-- Mirrors 0002_roles.sql / 0005_media_variants_grant.sql for this new table.

GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_settings" TO blueflutes_app;
