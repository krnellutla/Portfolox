-- Grant DML on media_variants to the restricted runtime role.
-- Mirrors the grants in 0002_roles.sql for the new table added in 0003.

GRANT SELECT, INSERT, UPDATE, DELETE ON "media_variants" TO blueflutes_app;
