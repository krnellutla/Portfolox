-- Commerce tables: print_options, carts, cart_items, shipping_methods, orders, order_items
-- Money is always stored as integer minor units (cents) with a currency field.

CREATE TABLE "print_options" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"    uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "photo_id"     uuid NOT NULL,
  "size"         text NOT NULL,
  "kind"         text NOT NULL,
  "framed"       boolean NOT NULL DEFAULT false,
  "price"        integer NOT NULL,
  "print_cost"   integer NOT NULL,
  "currency"     char(3) NOT NULL DEFAULT 'USD',
  "edition_size" integer,
  "edition_sold" integer NOT NULL DEFAULT 0,
  "created_at"   timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "carts" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"     uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id"       uuid,
  "session_token" text,
  "currency"      char(3) NOT NULL DEFAULT 'USD',
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "cart_items" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cart_id"          uuid NOT NULL REFERENCES "carts"("id") ON DELETE CASCADE,
  "photo_id"         uuid NOT NULL,
  "print_option_id"  uuid NOT NULL REFERENCES "print_options"("id"),
  "qty"              integer NOT NULL DEFAULT 1,
  "unit_price"       integer NOT NULL,
  "created_at"       timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "shipping_methods" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"  uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "label"      text NOT NULL,
  "estimate"   text NOT NULL,
  "price"      integer NOT NULL,
  "currency"   char(3) NOT NULL DEFAULT 'USD',
  "sort_order" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint

CREATE TABLE "orders" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "number"                text NOT NULL UNIQUE,
  "tenant_id"             uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "buyer_email"           text NOT NULL,
  "buyer_name"            text NOT NULL,
  "buyer_user_id"         uuid,
  "shipping_address_json" jsonb NOT NULL,
  "shipping_method_id"    uuid NOT NULL REFERENCES "shipping_methods"("id"),
  "shipping_price"        integer NOT NULL,
  "subtotal"              integer NOT NULL,
  "tax"                   integer NOT NULL DEFAULT 0,
  "total"                 integer NOT NULL,
  "currency"              char(3) NOT NULL DEFAULT 'USD',
  "status"                text NOT NULL DEFAULT 'pending',
  "timeline_json"         jsonb NOT NULL DEFAULT '[]',
  "tracking_url"          text,
  "order_token"           text NOT NULL,
  "payment_intent_id"     text,
  "created_at"            timestamptz NOT NULL DEFAULT now(),
  "updated_at"            timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "order_items" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id"         uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "photo_id"         uuid NOT NULL,
  "print_option_id"  uuid NOT NULL REFERENCES "print_options"("id"),
  "title"            text NOT NULL,
  "thumb_url"        text NOT NULL,
  "size"             text NOT NULL,
  "kind"             text NOT NULL,
  "qty"              integer NOT NULL,
  "unit_price"       integer NOT NULL,
  "print_cost"       integer NOT NULL
);
--> statement-breakpoint

-- Indexes
CREATE INDEX "print_options_tenant_id_idx" ON "print_options" ("tenant_id");
CREATE INDEX "print_options_photo_id_idx" ON "print_options" ("photo_id");
CREATE INDEX "carts_tenant_id_idx" ON "carts" ("tenant_id");
CREATE INDEX "carts_session_token_idx" ON "carts" ("session_token");
CREATE INDEX "shipping_methods_tenant_id_idx" ON "shipping_methods" ("tenant_id");
CREATE INDEX "orders_tenant_id_idx" ON "orders" ("tenant_id");
CREATE INDEX "orders_buyer_email_idx" ON "orders" ("buyer_email");
--> statement-breakpoint

-- RLS on tables with tenant_id
ALTER TABLE "print_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "print_options" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "print_options"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
--> statement-breakpoint

ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "carts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "carts"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
--> statement-breakpoint

ALTER TABLE "shipping_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shipping_methods" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "shipping_methods"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
--> statement-breakpoint

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "orders"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());
--> statement-breakpoint

-- cart_items and order_items have no direct tenant_id; they cascade through their parent.
-- No RLS needed: access is controlled via parent cart/order RLS.

-- Grants for the runtime role
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "print_options",
  "carts",
  "cart_items",
  "shipping_methods",
  "orders",
  "order_items"
TO blueflutes_app;
