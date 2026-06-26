-- Rename Postgres roles to match the new Blueflutes brand.
-- Safe to re-run: each block checks for existence before renaming.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portfoliohub_migrator') THEN
    ALTER ROLE portfoliohub_migrator RENAME TO blueflutes_migrator;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portfoliohub_app') THEN
    ALTER ROLE portfoliohub_app RENAME TO blueflutes_app;
  END IF;
END $$;
