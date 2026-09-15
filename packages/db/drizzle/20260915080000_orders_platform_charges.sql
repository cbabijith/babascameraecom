ALTER TABLE "orders" ADD COLUMN "platform_charges" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_total_matches_components";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_matches_components" CHECK ("orders"."total" = "orders"."subtotal" - "orders"."discount" + "orders"."shipping_charge" + "orders"."platform_charges");
