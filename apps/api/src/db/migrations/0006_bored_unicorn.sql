ALTER TABLE "media_variants" ADD COLUMN "object_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "media_variants" ADD COLUMN "byte_size" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "media_variants_asset_variant_idx" ON "media_variants" USING btree ("asset_id","variant");--> statement-breakpoint
CREATE INDEX "media_variants_tenant_asset_idx" ON "media_variants" USING btree ("tenant_id","asset_id");