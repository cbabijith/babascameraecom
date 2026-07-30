CREATE TYPE "public"."coupon_redemption_status" AS ENUM('reserved', 'applied', 'released');--> statement-breakpoint
CREATE TYPE "public"."coupon_type" AS ENUM('percentage', 'flat');--> statement-breakpoint
CREATE TYPE "public"."email_outbox_status" AS ENUM('pending', 'processing', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."inventory_reservation_status" AS ENUM('reserved', 'consumed', 'released');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_event_outcome" AS ENUM('pending', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('razorpay', 'cod');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'admin');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"pincode" text NOT NULL,
	"country" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	CONSTRAINT "addresses_label_not_blank" CHECK (length(trim("addresses"."label")) > 0),
	CONSTRAINT "addresses_line1_not_blank" CHECK (length(trim("addresses"."line1")) > 0),
	CONSTRAINT "addresses_pincode_not_blank" CHECK (length(trim("addresses"."pincode")) > 0)
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name"),
	CONSTRAINT "brands_slug_unique" UNIQUE("slug"),
	CONSTRAINT "brands_name_not_blank" CHECK (length(trim("brands"."name")) > 0),
	CONSTRAINT "brands_slug_format" CHECK ("brands"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" integer NOT NULL,
	CONSTRAINT "cart_items_quantity_positive" CHECK ("cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"expires_at" timestamp with time zone,
	CONSTRAINT "carts_exactly_one_owner" CHECK (("carts"."user_id" is not null) <> ("carts"."session_id" is not null)),
	CONSTRAINT "carts_session_id_not_blank" CHECK ("carts"."session_id" is null or length(trim("carts"."session_id")) >= 16)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"image_url" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "categories_not_own_parent" CHECK ("categories"."parent_id" is null or "categories"."parent_id" <> "categories"."id"),
	CONSTRAINT "categories_name_not_blank" CHECK (length(trim("categories"."name")) > 0),
	CONSTRAINT "categories_slug_format" CHECK ("categories"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid,
	"status" "coupon_redemption_status" DEFAULT 'reserved' NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"redeemed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	CONSTRAINT "coupon_redemptions_lifecycle_timestamps" CHECK (
        ("coupon_redemptions"."status" = 'reserved' and "coupon_redemptions"."redeemed_at" is null and "coupon_redemptions"."released_at" is null)
        or ("coupon_redemptions"."status" = 'applied' and "coupon_redemptions"."redeemed_at" is not null and "coupon_redemptions"."released_at" is null)
        or ("coupon_redemptions"."status" = 'released' and "coupon_redemptions"."released_at" is not null)
      )
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"code" text NOT NULL,
	"type" "coupon_type" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"min_order_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"max_discount" numeric(10, 2),
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code"),
	CONSTRAINT "coupons_code_not_blank" CHECK (length(trim("coupons"."code")) > 0),
	CONSTRAINT "coupons_code_uppercase" CHECK ("coupons"."code" = upper("coupons"."code")),
	CONSTRAINT "coupons_value_positive" CHECK ("coupons"."value" > 0),
	CONSTRAINT "coupons_percentage_at_most_100" CHECK ("coupons"."type" <> 'percentage' or "coupons"."value" <= 100),
	CONSTRAINT "coupons_min_order_amount_nonnegative" CHECK ("coupons"."min_order_amount" >= 0),
	CONSTRAINT "coupons_max_discount_nonnegative" CHECK ("coupons"."max_discount" is null or "coupons"."max_discount" >= 0),
	CONSTRAINT "coupons_usage_limit_positive" CHECK ("coupons"."usage_limit" is null or "coupons"."usage_limit" > 0),
	CONSTRAINT "coupons_used_count_nonnegative" CHECK ("coupons"."used_count" >= 0),
	CONSTRAINT "coupons_used_count_within_limit" CHECK ("coupons"."usage_limit" is null or "coupons"."used_count" <= "coupons"."usage_limit")
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid,
	"user_id" uuid,
	"to_email" text NOT NULL,
	"template" text NOT NULL,
	"subject" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "email_outbox_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "email_outbox_dedupe_key_unique" UNIQUE("dedupe_key"),
	CONSTRAINT "email_outbox_to_email_not_blank" CHECK (length(trim("email_outbox"."to_email")) > 3),
	CONSTRAINT "email_outbox_template_not_blank" CHECK (length(trim("email_outbox"."template")) > 0),
	CONSTRAINT "email_outbox_subject_not_blank" CHECK (length(trim("email_outbox"."subject")) > 0),
	CONSTRAINT "email_outbox_dedupe_key_not_blank" CHECK (length(trim("email_outbox"."dedupe_key")) > 0),
	CONSTRAINT "email_outbox_attempt_count_nonnegative" CHECK ("email_outbox"."attempt_count" >= 0),
	CONSTRAINT "email_outbox_sent_timestamp" CHECK ("email_outbox"."status" <> 'sent' or "email_outbox"."sent_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" integer NOT NULL,
	"status" "inventory_reservation_status" DEFAULT 'reserved' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	CONSTRAINT "inventory_reservations_quantity_positive" CHECK ("inventory_reservations"."quantity" > 0),
	CONSTRAINT "inventory_reservations_lifecycle" CHECK (
        ("inventory_reservations"."status" = 'reserved' and "inventory_reservations"."consumed_at" is null and "inventory_reservations"."released_at" is null)
        or ("inventory_reservations"."status" = 'consumed' and "inventory_reservations"."consumed_at" is not null and "inventory_reservations"."released_at" is null)
        or ("inventory_reservations"."status" = 'released' and "inventory_reservations"."released_at" is not null and "inventory_reservations"."consumed_at" is null)
      )
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"source" text DEFAULT 'storefront' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscriptions_email_unique" UNIQUE("email"),
	CONSTRAINT "newsletter_subscriptions_email_not_blank" CHECK (length(trim("newsletter_subscriptions"."email")) > 3),
	CONSTRAINT "newsletter_subscriptions_lifecycle" CHECK (("newsletter_subscriptions"."is_active" = true and "newsletter_subscriptions"."unsubscribed_at" is null)
          or ("newsletter_subscriptions"."is_active" = false and "newsletter_subscriptions"."unsubscribed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"product_name" text NOT NULL,
	"variant_label" text,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	CONSTRAINT "order_items_product_name_not_blank" CHECK (length(trim("order_items"."product_name")) > 0),
	CONSTRAINT "order_items_sku_not_blank" CHECK (length(trim("order_items"."sku")) > 0),
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price_nonnegative" CHECK ("order_items"."unit_price" >= 0),
	CONSTRAINT "order_items_total_nonnegative" CHECK ("order_items"."total" >= 0),
	CONSTRAINT "order_items_total_matches_quantity" CHECK ("order_items"."total" = "order_items"."unit_price" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"note" text,
	"actor_id" uuid,
	CONSTRAINT "order_status_history_status_changed" CHECK ("order_status_history"."from_status" is null or "order_status_history"."from_status" <> "order_status_history"."to_status")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" uuid,
	"guest_session_hash" text,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"customer_email" text NOT NULL,
	"customer_name" text,
	"customer_phone" text,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"subtotal" numeric(10, 2) NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"shipping_charge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"notes" text,
	"shipping_address_snapshot" jsonb NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"tracking_url" text,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "orders_order_number_not_blank" CHECK (length(trim("orders"."order_number")) > 0),
	CONSTRAINT "orders_at_most_one_owner" CHECK ("orders"."user_id" is null or "orders"."guest_session_hash" is null),
	CONSTRAINT "orders_guest_session_hash_format" CHECK ("orders"."guest_session_hash" is null or "orders"."guest_session_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "orders_customer_email_not_blank" CHECK (length(trim("orders"."customer_email")) > 3),
	CONSTRAINT "orders_subtotal_nonnegative" CHECK ("orders"."subtotal" >= 0),
	CONSTRAINT "orders_discount_nonnegative" CHECK ("orders"."discount" >= 0),
	CONSTRAINT "orders_discount_not_above_subtotal" CHECK ("orders"."discount" <= "orders"."subtotal"),
	CONSTRAINT "orders_shipping_charge_nonnegative" CHECK ("orders"."shipping_charge" >= 0),
	CONSTRAINT "orders_total_nonnegative" CHECK ("orders"."total" >= 0),
	CONSTRAINT "orders_total_matches_components" CHECK ("orders"."total" = "orders"."subtotal" - "orders"."discount" + "orders"."shipping_charge"),
	CONSTRAINT "orders_payment_provider_fields" CHECK ("orders"."payment_method" = 'razorpay'
          or ("orders"."razorpay_order_id" is null and "orders"."razorpay_payment_id" is null)),
	CONSTRAINT "orders_tracking_fields_coherent" CHECK ("orders"."tracking_number" is null or "orders"."carrier" is not null),
	CONSTRAINT "orders_delivery_after_shipping" CHECK ("orders"."delivered_at" is null
          or ("orders"."shipped_at" is not null and "orders"."delivered_at" >= "orders"."shipped_at"))
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid,
	"provider_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"outcome" "payment_event_outcome" DEFAULT 'pending' NOT NULL,
	"error" text,
	CONSTRAINT "payment_events_provider_event_id_unique" UNIQUE("provider_event_id"),
	CONSTRAINT "payment_events_provider_event_id_not_blank" CHECK (length(trim("payment_events"."provider_event_id")) > 0),
	CONSTRAINT "payment_events_type_not_blank" CHECK (length(trim("payment_events"."type")) > 0)
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_images_url_not_blank" CHECK (length(trim("product_images"."url")) > 0),
	CONSTRAINT "product_images_position_nonnegative" CHECK ("product_images"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"sku" text NOT NULL,
	"additional_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_variants_name_not_blank" CHECK (length(trim("product_variants"."name")) > 0),
	CONSTRAINT "product_variants_value_not_blank" CHECK (length(trim("product_variants"."value")) > 0),
	CONSTRAINT "product_variants_sku_not_blank" CHECK (length(trim("product_variants"."sku")) > 0),
	CONSTRAINT "product_variants_additional_price_nonnegative" CHECK ("product_variants"."additional_price" >= 0),
	CONSTRAINT "product_variants_stock_nonnegative" CHECK ("product_variants"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"short_description" text,
	"category_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"mrp" numeric(10, 2) NOT NULL,
	"sale_price" numeric(10, 2) NOT NULL,
	"cost_price" numeric(10, 2),
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"weight" numeric(6, 2),
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"meta_title" text,
	"meta_description" text,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_name_not_blank" CHECK (length(trim("products"."name")) > 0),
	CONSTRAINT "products_slug_format" CHECK ("products"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "products_sku_not_blank" CHECK (length(trim("products"."sku")) > 0),
	CONSTRAINT "products_mrp_nonnegative" CHECK ("products"."mrp" >= 0),
	CONSTRAINT "products_sale_price_nonnegative" CHECK ("products"."sale_price" >= 0),
	CONSTRAINT "products_sale_price_not_above_mrp" CHECK ("products"."sale_price" <= "products"."mrp"),
	CONSTRAINT "products_cost_price_nonnegative" CHECK ("products"."cost_price" is null or "products"."cost_price" >= 0),
	CONSTRAINT "products_stock_nonnegative" CHECK ("products"."stock" >= 0),
	CONSTRAINT "products_low_stock_threshold_nonnegative" CHECK ("products"."low_stock_threshold" >= 0),
	CONSTRAINT "products_weight_positive" CHECK ("products"."weight" is null or "products"."weight" > 0)
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_event_id" uuid,
	"provider_payment_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"provider_refund_id" text,
	"idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "refunds_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "refunds_provider_payment_id_not_blank" CHECK (length(trim("refunds"."provider_payment_id")) > 0),
	CONSTRAINT "refunds_amount_positive" CHECK ("refunds"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"body" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"label" text,
	"group" text DEFAULT 'general' NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key"),
	CONSTRAINT "settings_key_format" CHECK ("settings"."key" ~ '^[a-z][a-z0-9_.-]*$'),
	CONSTRAINT "settings_group_not_blank" CHECK (length(trim("settings"."group")) > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"phone" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_not_blank" CHECK (length(trim("users"."email")) > 3)
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_event_id_payment_events_id_fk" FOREIGN KEY ("payment_event_id") REFERENCES "public"."payment_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_id_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_one_default_per_user_idx" ON "addresses" USING btree ("user_id") WHERE "addresses"."is_default" = true;--> statement-breakpoint
CREATE INDEX "brands_active_idx" ON "brands" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "cart_items_product_id_idx" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_product_without_variant_unique" ON "cart_items" USING btree ("cart_id","product_id") WHERE "cart_items"."variant_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_product_variant_unique" ON "cart_items" USING btree ("cart_id","product_id","variant_id") WHERE "cart_items"."variant_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "carts_user_id_unique" ON "carts" USING btree ("user_id") WHERE "carts"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "carts_session_id_unique" ON "carts" USING btree ("session_id") WHERE "carts"."session_id" is not null;--> statement-breakpoint
CREATE INDEX "carts_expires_at_idx" ON "carts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "categories_active_idx" ON "categories" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemptions_order_unique" ON "coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_status_idx" ON "coupon_redemptions" USING btree ("coupon_id","status");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_user_id_idx" ON "coupon_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coupons_active_expires_at_idx" ON "coupons" USING btree ("is_active","expires_at");--> statement-breakpoint
CREATE INDEX "email_outbox_pending_idx" ON "email_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "email_outbox_order_id_idx" ON "email_outbox" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "email_outbox_user_id_idx" ON "email_outbox" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_order_id_idx" ON "inventory_reservations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_status_expires_idx" ON "inventory_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "inventory_reservations_product_id_idx" ON "inventory_reservations" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_reservations_product_without_variant_unique" ON "inventory_reservations" USING btree ("order_id","product_id") WHERE "inventory_reservations"."variant_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_reservations_product_variant_unique" ON "inventory_reservations" USING btree ("order_id","product_id","variant_id") WHERE "inventory_reservations"."variant_id" is not null;--> statement-breakpoint
CREATE INDEX "newsletter_subscriptions_active_idx" ON "newsletter_subscriptions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_created_idx" ON "order_status_history" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_status_history_actor_id_idx" ON "order_status_history" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_guest_session_hash_idx" ON "orders" USING btree ("guest_session_hash");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "orders_customer_email_idx" ON "orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "orders_tracking_number_idx" ON "orders" USING btree ("tracking_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_razorpay_order_id_unique" ON "orders" USING btree ("razorpay_order_id") WHERE "orders"."razorpay_order_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_razorpay_payment_id_unique" ON "orders" USING btree ("razorpay_payment_id") WHERE "orders"."razorpay_payment_id" is not null;--> statement-breakpoint
CREATE INDEX "payment_events_order_id_idx" ON "payment_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_events_outcome_created_idx" ON "payment_events" USING btree ("outcome","created_at");--> statement-breakpoint
CREATE INDEX "product_images_product_id_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_product_position_unique" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_one_primary_per_product_idx" ON "product_images" USING btree ("product_id") WHERE "product_images"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_product_name_value_unique" ON "product_variants" USING btree ("product_id","name","value");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_brand_id_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_active_featured_idx" ON "products" USING btree ("is_active","is_featured");--> statement-breakpoint
CREATE INDEX "products_stock_idx" ON "products" USING btree ("stock");--> statement-breakpoint
CREATE INDEX "refunds_order_id_idx" ON "refunds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "refunds_status_created_idx" ON "refunds" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_provider_refund_id_unique" ON "refunds" USING btree ("provider_refund_id") WHERE "refunds"."provider_refund_id" is not null;--> statement-breakpoint
CREATE INDEX "reviews_product_approved_idx" ON "reviews" USING btree ("product_id","is_approved");--> statement-breakpoint
CREATE INDEX "reviews_user_id_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_product_unique" ON "reviews" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "settings_group_idx" ON "settings" USING btree ("group");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_active_role_idx" ON "users" USING btree ("is_active","role");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlists_user_product_unique" ON "wishlists" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "wishlists_product_id_idx" ON "wishlists" USING btree ("product_id");--> statement-breakpoint

-- Supabase prerequisites are intentional: Auth and Storage are part of this application's database contract.
DO $$
BEGIN
	IF to_regclass('auth.users') IS NULL THEN
		RAISE EXCEPTION 'Supabase prerequisite missing: auth.users';
	END IF;

	IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
		RAISE EXCEPTION 'Supabase prerequisite missing: storage schema';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
		OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
		OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
		RAISE EXCEPTION 'Supabase prerequisite missing: API roles';
	END IF;
END
$$;--> statement-breakpoint

ALTER TABLE "public"."users"
	ADD CONSTRAINT "users_id_auth_users_id_fk"
	FOREIGN KEY ("id") REFERENCES "auth"."users"("id")
	ON DELETE CASCADE;--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	INSERT INTO public.users (
		id,
		email,
		full_name,
		phone,
		role,
		avatar_url,
		is_active
	)
	VALUES (
		NEW.id,
		COALESCE(
			NULLIF(lower(trim(NEW.email)), ''),
			NEW.id::text || '@users.invalid'
		),
		NULLIF(
			trim(COALESCE(
				NEW.raw_user_meta_data ->> 'full_name',
				NEW.raw_user_meta_data ->> 'name',
				''
			)),
			''
		),
		COALESCE(
			NULLIF(trim(NEW.phone), ''),
			NULLIF(trim(NEW.raw_user_meta_data ->> 'phone'), '')
		),
		'customer',
		NULLIF(trim(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
		true
	)
	ON CONFLICT (id) DO UPDATE
	SET
		email = EXCLUDED.email,
		full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
		phone = COALESCE(public.users.phone, EXCLUDED.phone),
		avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
		updated_at = now();

	RETURN NEW;
END
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION "public"."handle_new_auth_user"() FROM PUBLIC;--> statement-breakpoint

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";--> statement-breakpoint
CREATE TRIGGER "on_auth_user_created"
	AFTER INSERT ON "auth"."users"
	FOR EACH ROW
	EXECUTE FUNCTION "public"."handle_new_auth_user"();--> statement-breakpoint

INSERT INTO "public"."users" (
	id,
	email,
	full_name,
	phone,
	role,
	avatar_url,
	is_active
)
SELECT
	auth_user.id,
	COALESCE(
		NULLIF(lower(trim(auth_user.email)), ''),
		auth_user.id::text || '@users.invalid'
	),
	NULLIF(
		trim(COALESCE(
			auth_user.raw_user_meta_data ->> 'full_name',
			auth_user.raw_user_meta_data ->> 'name',
			''
		)),
		''
	),
	COALESCE(
		NULLIF(trim(auth_user.phone), ''),
		NULLIF(trim(auth_user.raw_user_meta_data ->> 'phone'), '')
	),
	'customer',
	NULLIF(trim(auth_user.raw_user_meta_data ->> 'avatar_url'), ''),
	true
FROM "auth"."users" AS auth_user
ON CONFLICT (id) DO UPDATE
SET
	email = EXCLUDED.email,
	full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
	phone = COALESCE(public.users.phone, EXCLUDED.phone),
	avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
	updated_at = now();--> statement-breakpoint

CREATE UNIQUE INDEX "users_email_lower_unique"
	ON "public"."users" (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscriptions_email_lower_unique"
	ON "public"."newsletter_subscriptions" (lower("email"));--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."set_updated_at"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
	NEW.updated_at := now();
	RETURN NEW;
END
$$;--> statement-breakpoint

DO $$
DECLARE
	target_table text;
BEGIN
	FOREACH target_table IN ARRAY ARRAY[
		'addresses',
		'brands',
		'cart_items',
		'carts',
		'categories',
		'coupon_redemptions',
		'coupons',
		'email_outbox',
		'inventory_reservations',
		'newsletter_subscriptions',
		'order_items',
		'order_status_history',
		'orders',
		'payment_events',
		'product_images',
		'product_variants',
		'products',
		'refunds',
		'reviews',
		'settings',
		'users',
		'wishlists'
	]
	LOOP
		EXECUTE format(
			'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I '
			|| 'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
			target_table
		);
	END LOOP;
END
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."validate_product_variant_pair"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF NEW.variant_id IS NOT NULL AND (
		NEW.product_id IS NULL
		OR NOT EXISTS (
			SELECT 1
			FROM public.product_variants AS variant
			WHERE variant.id = NEW.variant_id
				AND variant.product_id = NEW.product_id
		)
	) THEN
		RAISE EXCEPTION 'Variant % does not belong to product %', NEW.variant_id, NEW.product_id
			USING ERRCODE = '23514';
	END IF;

	RETURN NEW;
END
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION "public"."validate_product_variant_pair"() FROM PUBLIC;--> statement-breakpoint

CREATE TRIGGER "cart_items_validate_product_variant"
	BEFORE INSERT OR UPDATE OF "product_id", "variant_id" ON "public"."cart_items"
	FOR EACH ROW EXECUTE FUNCTION "public"."validate_product_variant_pair"();--> statement-breakpoint
CREATE TRIGGER "order_items_validate_product_variant"
	BEFORE INSERT ON "public"."order_items"
	FOR EACH ROW EXECUTE FUNCTION "public"."validate_product_variant_pair"();--> statement-breakpoint
CREATE TRIGGER "inventory_reservations_validate_product_variant"
	BEFORE INSERT OR UPDATE OF "product_id", "variant_id" ON "public"."inventory_reservations"
	FOR EACH ROW EXECUTE FUNCTION "public"."validate_product_variant_pair"();--> statement-breakpoint

CREATE SEQUENCE "public"."order_number_seq"
	AS bigint
	START WITH 1
	INCREMENT BY 1
	NO CYCLE;--> statement-breakpoint

REVOKE ALL ON SEQUENCE "public"."order_number_seq" FROM PUBLIC, anon, authenticated;--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."next_order_number"()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	sequence_value bigint;
	order_year text;
BEGIN
	sequence_value := nextval('public.order_number_seq'::regclass);
	order_year := to_char(timezone('Asia/Kolkata', clock_timestamp()), 'YYYY');

	RETURN format('BC-%s-%s', order_year, lpad(sequence_value::text, 5, '0'));
END
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION "public"."next_order_number"() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."next_order_number"() TO service_role;--> statement-breakpoint

ALTER TABLE "public"."orders"
	ALTER COLUMN "order_number" SET DEFAULT "public"."next_order_number"();--> statement-breakpoint

COMMENT ON FUNCTION "public"."next_order_number"()
	IS 'Concurrency-safe BC-YYYY-00001-style order identifier. Gaps are expected after rolled-back transactions.';--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."is_active_user"()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.users AS app_user
		WHERE app_user.id = (SELECT auth.uid())
			AND app_user.is_active = true
	)
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."is_admin"()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.users AS app_user
		WHERE app_user.id = (SELECT auth.uid())
			AND app_user.role = 'admin'
			AND app_user.is_active = true
	)
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION "public"."is_active_user"() FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."is_active_user"() TO authenticated, service_role;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO authenticated, service_role;--> statement-breakpoint

ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."coupon_redemptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."email_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."inventory_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."newsletter_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."payment_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."wishlists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

REVOKE ALL PRIVILEGES ON TABLE
	"public"."addresses",
	"public"."brands",
	"public"."cart_items",
	"public"."carts",
	"public"."categories",
	"public"."coupon_redemptions",
	"public"."coupons",
	"public"."email_outbox",
	"public"."inventory_reservations",
	"public"."newsletter_subscriptions",
	"public"."order_items",
	"public"."order_status_history",
	"public"."orders",
	"public"."payment_events",
	"public"."product_images",
	"public"."product_variants",
	"public"."products",
	"public"."refunds",
	"public"."reviews",
	"public"."settings",
	"public"."users",
	"public"."wishlists"
FROM anon, authenticated;--> statement-breakpoint

GRANT ALL PRIVILEGES ON TABLE
	"public"."addresses",
	"public"."brands",
	"public"."cart_items",
	"public"."carts",
	"public"."categories",
	"public"."coupon_redemptions",
	"public"."coupons",
	"public"."email_outbox",
	"public"."inventory_reservations",
	"public"."newsletter_subscriptions",
	"public"."order_items",
	"public"."order_status_history",
	"public"."orders",
	"public"."payment_events",
	"public"."product_images",
	"public"."product_variants",
	"public"."products",
	"public"."refunds",
	"public"."reviews",
	"public"."settings",
	"public"."users",
	"public"."wishlists"
TO service_role;--> statement-breakpoint

GRANT USAGE ON SCHEMA "public" TO anon, authenticated;--> statement-breakpoint
GRANT USAGE ON TYPE
	"public"."coupon_redemption_status",
	"public"."coupon_type",
	"public"."email_outbox_status",
	"public"."inventory_reservation_status",
	"public"."order_status",
	"public"."payment_event_outcome",
	"public"."payment_method",
	"public"."payment_status",
	"public"."refund_status",
	"public"."user_role"
TO anon, authenticated;--> statement-breakpoint

GRANT SELECT ON TABLE
	"public"."addresses",
	"public"."brands",
	"public"."cart_items",
	"public"."carts",
	"public"."categories",
	"public"."coupon_redemptions",
	"public"."coupons",
	"public"."email_outbox",
	"public"."inventory_reservations",
	"public"."newsletter_subscriptions",
	"public"."order_items",
	"public"."order_status_history",
	"public"."orders",
	"public"."payment_events",
	"public"."product_images",
	"public"."product_variants",
	"public"."products",
	"public"."refunds",
	"public"."reviews",
	"public"."settings",
	"public"."users",
	"public"."wishlists"
TO authenticated;--> statement-breakpoint

GRANT SELECT ON TABLE
	"public"."brands",
	"public"."categories",
	"public"."product_images",
	"public"."product_variants",
	"public"."products",
	"public"."reviews",
	"public"."settings"
TO anon;--> statement-breakpoint

GRANT INSERT, UPDATE, DELETE ON TABLE
	"public"."addresses",
	"public"."cart_items",
	"public"."carts"
TO authenticated;--> statement-breakpoint
GRANT INSERT, DELETE ON TABLE "public"."wishlists" TO authenticated;--> statement-breakpoint
GRANT INSERT, DELETE ON TABLE "public"."reviews" TO authenticated;--> statement-breakpoint
GRANT UPDATE ("rating", "title", "body") ON TABLE "public"."reviews" TO authenticated;--> statement-breakpoint
GRANT UPDATE ("full_name", "phone", "avatar_url") ON TABLE "public"."users" TO authenticated;--> statement-breakpoint
GRANT INSERT ("email", "full_name") ON TABLE "public"."newsletter_subscriptions"
	TO anon, authenticated;--> statement-breakpoint

DO $$
DECLARE
	target_table text;
BEGIN
	FOREACH target_table IN ARRAY ARRAY[
		'addresses',
		'brands',
		'cart_items',
		'carts',
		'categories',
		'coupon_redemptions',
		'coupons',
		'email_outbox',
		'inventory_reservations',
		'newsletter_subscriptions',
		'order_items',
		'order_status_history',
		'orders',
		'payment_events',
		'product_images',
		'product_variants',
		'products',
		'refunds',
		'reviews',
		'settings',
		'users',
		'wishlists'
	]
	LOOP
		EXECUTE format(
			'CREATE POLICY %I ON public.%I '
			|| 'AS PERMISSIVE FOR ALL TO authenticated '
			|| 'USING ((SELECT public.is_admin())) '
			|| 'WITH CHECK ((SELECT public.is_admin()))',
			target_table || '_admin_all',
			target_table
		);
	END LOOP;
END
$$;--> statement-breakpoint

CREATE POLICY "users_read_self"
	ON "public"."users"
	FOR SELECT TO authenticated
	USING ("id" = (SELECT auth.uid()));--> statement-breakpoint
CREATE POLICY "users_update_safe_profile"
	ON "public"."users"
	FOR UPDATE TO authenticated
	USING (
		"id" = (SELECT auth.uid())
		AND (SELECT public.is_active_user())
	)
	WITH CHECK (
		"id" = (SELECT auth.uid())
		AND "role" = 'customer'
		AND "is_active" = true
	);--> statement-breakpoint

CREATE POLICY "addresses_owner_all"
	ON "public"."addresses"
	FOR ALL TO authenticated
	USING (
		"user_id" = (SELECT auth.uid())
		AND (SELECT public.is_active_user())
	)
	WITH CHECK (
		"user_id" = (SELECT auth.uid())
		AND (SELECT public.is_active_user())
	);--> statement-breakpoint

CREATE POLICY "brands_public_read"
	ON "public"."brands"
	FOR SELECT TO anon, authenticated
	USING ("is_active" = true);--> statement-breakpoint
CREATE POLICY "categories_public_read"
	ON "public"."categories"
	FOR SELECT TO anon, authenticated
	USING ("is_active" = true);--> statement-breakpoint
CREATE POLICY "products_public_read"
	ON "public"."products"
	FOR SELECT TO anon, authenticated
	USING (
		"is_active" = true
		AND EXISTS (
			SELECT 1 FROM public.categories AS category
			WHERE category.id = products.category_id
				AND category.is_active = true
		)
		AND EXISTS (
			SELECT 1 FROM public.brands AS brand
			WHERE brand.id = products.brand_id
				AND brand.is_active = true
		)
	);--> statement-breakpoint
CREATE POLICY "product_images_public_read"
	ON "public"."product_images"
	FOR SELECT TO anon, authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.products AS product
			WHERE product.id = product_images.product_id
				AND product.is_active = true
		)
	);--> statement-breakpoint
CREATE POLICY "product_variants_public_read"
	ON "public"."product_variants"
	FOR SELECT TO anon, authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.products AS product
			WHERE product.id = product_variants.product_id
				AND product.is_active = true
		)
	);--> statement-breakpoint

CREATE POLICY "carts_owner_all"
	ON "public"."carts"
	FOR ALL TO authenticated
	USING (
		"user_id" = (SELECT auth.uid())
		AND "session_id" IS NULL
		AND (SELECT public.is_active_user())
	)
	WITH CHECK (
		"user_id" = (SELECT auth.uid())
		AND "session_id" IS NULL
		AND (SELECT public.is_active_user())
	);--> statement-breakpoint
CREATE POLICY "cart_items_owner_all"
	ON "public"."cart_items"
	FOR ALL TO authenticated
	USING (
		(SELECT public.is_active_user())
		AND EXISTS (
			SELECT 1 FROM public.carts AS owner_cart
			WHERE owner_cart.id = cart_items.cart_id
				AND owner_cart.user_id = (SELECT auth.uid())
		)
	)
	WITH CHECK (
		(SELECT public.is_active_user())
		AND EXISTS (
			SELECT 1 FROM public.carts AS owner_cart
			WHERE owner_cart.id = cart_items.cart_id
				AND owner_cart.user_id = (SELECT auth.uid())
		)
	);--> statement-breakpoint

CREATE POLICY "orders_owner_read"
	ON "public"."orders"
	FOR SELECT TO authenticated
	USING (
		"user_id" = (SELECT auth.uid())
		AND (SELECT public.is_active_user())
	);--> statement-breakpoint
CREATE POLICY "order_items_owner_read"
	ON "public"."order_items"
	FOR SELECT TO authenticated
	USING (
		(SELECT public.is_active_user())
		AND EXISTS (
			SELECT 1 FROM public.orders AS owner_order
			WHERE owner_order.id = order_items.order_id
				AND owner_order.user_id = (SELECT auth.uid())
		)
	);--> statement-breakpoint
CREATE POLICY "order_status_history_owner_read"
	ON "public"."order_status_history"
	FOR SELECT TO authenticated
	USING (
		(SELECT public.is_active_user())
		AND EXISTS (
			SELECT 1 FROM public.orders AS owner_order
			WHERE owner_order.id = order_status_history.order_id
				AND owner_order.user_id = (SELECT auth.uid())
		)
	);--> statement-breakpoint
CREATE POLICY "coupon_redemptions_owner_read"
	ON "public"."coupon_redemptions"
	FOR SELECT TO authenticated
	USING (
		(SELECT public.is_active_user())
		AND EXISTS (
			SELECT 1 FROM public.orders AS owner_order
			WHERE owner_order.id = coupon_redemptions.order_id
				AND owner_order.user_id = (SELECT auth.uid())
		)
	);--> statement-breakpoint
CREATE POLICY "refunds_owner_read"
	ON "public"."refunds"
	FOR SELECT TO authenticated
	USING (
		(SELECT public.is_active_user())
		AND EXISTS (
			SELECT 1 FROM public.orders AS owner_order
			WHERE owner_order.id = refunds.order_id
				AND owner_order.user_id = (SELECT auth.uid())
		)
	);--> statement-breakpoint
CREATE POLICY "inventory_reservations_owner_read"
	ON "public"."inventory_reservations"
	FOR SELECT TO authenticated
	USING (
		(SELECT public.is_active_user())
		AND EXISTS (
			SELECT 1 FROM public.orders AS owner_order
			WHERE owner_order.id = inventory_reservations.order_id
				AND owner_order.user_id = (SELECT auth.uid())
		)
	);--> statement-breakpoint

CREATE POLICY "reviews_public_read"
	ON "public"."reviews"
	FOR SELECT TO anon, authenticated
	USING (
		"is_approved" = true
		AND EXISTS (
			SELECT 1 FROM public.products AS reviewed_product
			WHERE reviewed_product.id = reviews.product_id
				AND reviewed_product.is_active = true
		)
	);--> statement-breakpoint
CREATE POLICY "reviews_owner_read"
	ON "public"."reviews"
	FOR SELECT TO authenticated
	USING (
		"user_id" = (SELECT auth.uid())
		AND (SELECT public.is_active_user())
	);--> statement-breakpoint
CREATE POLICY "reviews_owner_insert"
	ON "public"."reviews"
	FOR INSERT TO authenticated
	WITH CHECK (
		"user_id" = (SELECT auth.uid())
		AND "is_approved" = false
		AND (SELECT public.is_active_user())
	);--> statement-breakpoint
CREATE POLICY "reviews_owner_update"
	ON "public"."reviews"
	FOR UPDATE TO authenticated
	USING (
		"user_id" = (SELECT auth.uid())
		AND "is_approved" = false
		AND (SELECT public.is_active_user())
	)
	WITH CHECK (
		"user_id" = (SELECT auth.uid())
		AND "is_approved" = false
		AND (SELECT public.is_active_user())
	);--> statement-breakpoint
CREATE POLICY "reviews_owner_delete"
	ON "public"."reviews"
	FOR DELETE TO authenticated
	USING (
		"user_id" = (SELECT auth.uid())
		AND (SELECT public.is_active_user())
	);--> statement-breakpoint

CREATE POLICY "wishlists_owner_read"
	ON "public"."wishlists"
	FOR SELECT TO authenticated
	USING (
		"user_id" = (SELECT auth.uid())
		AND (SELECT public.is_active_user())
	);--> statement-breakpoint
CREATE POLICY "wishlists_owner_insert"
	ON "public"."wishlists"
	FOR INSERT TO authenticated
	WITH CHECK (
		"user_id" = (SELECT auth.uid())
		AND (SELECT public.is_active_user())
	);--> statement-breakpoint
CREATE POLICY "wishlists_owner_delete"
	ON "public"."wishlists"
	FOR DELETE TO authenticated
	USING (
		"user_id" = (SELECT auth.uid())
		AND (SELECT public.is_active_user())
	);--> statement-breakpoint

CREATE POLICY "settings_public_read"
	ON "public"."settings"
	FOR SELECT TO anon, authenticated
	USING (
		"key" = ANY (ARRAY[
			'store.profile',
			'shipping.rules',
			'cod.rules',
			'seo.defaults',
			'notifications.toggles',
			'homepage.hero'
		]::text[])
	);--> statement-breakpoint

CREATE POLICY "newsletter_public_subscribe"
	ON "public"."newsletter_subscriptions"
	FOR INSERT TO anon, authenticated
	WITH CHECK (
		"is_active" = true
		AND "unsubscribed_at" IS NULL
		AND "source" = 'storefront'
	);--> statement-breakpoint

CREATE INDEX "products_search_fts_idx"
	ON "public"."products"
	USING gin (
		(
			setweight(to_tsvector('simple'::regconfig, COALESCE("name", '')), 'A')
			|| setweight(to_tsvector('simple'::regconfig, COALESCE("sku", '')), 'A')
			|| setweight(to_tsvector('simple'::regconfig, COALESCE("short_description", '')), 'B')
			|| setweight(to_tsvector('simple'::regconfig, COALESCE("description", '')), 'C')
			|| setweight(to_tsvector('simple'::regconfig, COALESCE("meta_title", '')), 'B')
			|| setweight(to_tsvector('simple'::regconfig, COALESCE("meta_description", '')), 'C')
		)
	);--> statement-breakpoint

INSERT INTO "storage"."buckets" (
	"id",
	"name",
	"public",
	"file_size_limit",
	"allowed_mime_types"
)
VALUES (
	'product-images',
	'product-images',
	true,
	5242880,
	ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT ("id") DO UPDATE
SET
	"name" = EXCLUDED."name",
	"public" = EXCLUDED."public",
	"file_size_limit" = EXCLUDED."file_size_limit",
	"allowed_mime_types" = EXCLUDED."allowed_mime_types";--> statement-breakpoint

CREATE POLICY "product_images_storage_public_read"
	ON "storage"."objects"
	FOR SELECT TO PUBLIC
	USING ("bucket_id" = 'product-images');--> statement-breakpoint
CREATE POLICY "product_images_storage_admin_insert"
	ON "storage"."objects"
	FOR INSERT TO authenticated
	WITH CHECK (
		"bucket_id" = 'product-images'
		AND (SELECT public.is_admin())
		AND lower("name") ~ '\.(jpg|jpeg|png|webp)$'
	);--> statement-breakpoint
CREATE POLICY "product_images_storage_admin_update"
	ON "storage"."objects"
	FOR UPDATE TO authenticated
	USING (
		"bucket_id" = 'product-images'
		AND (SELECT public.is_admin())
	)
	WITH CHECK (
		"bucket_id" = 'product-images'
		AND (SELECT public.is_admin())
		AND lower("name") ~ '\.(jpg|jpeg|png|webp)$'
	);--> statement-breakpoint
CREATE POLICY "product_images_storage_admin_delete"
	ON "storage"."objects"
	FOR DELETE TO authenticated
	USING (
		"bucket_id" = 'product-images'
		AND (SELECT public.is_admin())
	);--> statement-breakpoint

INSERT INTO "public"."settings" ("key", "value", "label", "group")
VALUES
	(
		'store.profile',
		'{"name":"Baba''s Camera","email":"","phone":"","address":""}'::jsonb,
		'Store profile',
		'store'
	),
	(
		'shipping.rules',
		'{"flatCharge":"0.00","freeAbove":"0.00","currency":"INR"}'::jsonb,
		'Shipping charge rules',
		'checkout'
	),
	(
		'cod.rules',
		'{"enabled":true,"maxOrderAmount":"25000.00","pincodeMode":"all","allowedPincodes":[]}'::jsonb,
		'Cash on delivery rules',
		'checkout'
	),
	(
		'seo.defaults',
		'{"title":"Baba''s Camera","description":"Cameras, lenses and photography equipment.","siteName":"Baba''s Camera"}'::jsonb,
		'Default search metadata',
		'seo'
	),
	(
		'notifications.toggles',
		'{"orderConfirmation":true,"paymentConfirmation":true,"shippingUpdate":true,"adminNewOrder":true}'::jsonb,
		'Email notification toggles',
		'notifications'
	),
	(
		'homepage.hero',
		'{"eyebrow":"Baba''s Camera","title":"Capture every story","description":"Shop trusted cameras, lenses and accessories.","ctaLabel":"Shop products","ctaHref":"/products"}'::jsonb,
		'Home page hero',
		'content'
	)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint

COMMENT ON COLUMN "public"."users"."role"
	IS 'Never writable by customer tokens. Admin promotion must use a trusted server or direct database connection.';--> statement-breakpoint
COMMENT ON COLUMN "public"."users"."is_active"
	IS 'Disabled users are rejected by customer RLS helpers; applications must also block their authenticated session at the server boundary.';--> statement-breakpoint
COMMENT ON COLUMN "public"."orders"."guest_session_hash"
	IS 'SHA-256 of the HTTP-only guest session, never the raw cookie. Checkout must provide user_id or guest_session_hash; both may become null only when an authenticated user is later deleted.';--> statement-breakpoint
COMMENT ON COLUMN "public"."email_outbox"."dedupe_key"
	IS 'Deterministic replay guard such as order-confirmation:<order-id> or payment-confirmation:<provider-event-id>.';--> statement-breakpoint
COMMENT ON TABLE "public"."inventory_reservations"
	IS 'Reserve under row locks during checkout; consume or release exactly once when payment/order state resolves.';--> statement-breakpoint
COMMENT ON TABLE "public"."settings"
	IS 'Only the explicit public policy allowlist may contain storefront-readable, non-secret configuration.';--> statement-breakpoint

DO $$
DECLARE
	missing_rls_table text;
BEGIN
	SELECT class.relname
	INTO missing_rls_table
	FROM pg_class AS class
	JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
	WHERE namespace.nspname = 'public'
		AND class.relname = ANY (ARRAY[
			'addresses',
			'brands',
			'cart_items',
			'carts',
			'categories',
			'coupon_redemptions',
			'coupons',
			'email_outbox',
			'inventory_reservations',
			'newsletter_subscriptions',
			'order_items',
			'order_status_history',
			'orders',
			'payment_events',
			'product_images',
			'product_variants',
			'products',
			'refunds',
			'reviews',
			'settings',
			'users',
			'wishlists'
		])
		AND class.relrowsecurity = false
	LIMIT 1;

	IF missing_rls_table IS NOT NULL THEN
		RAISE EXCEPTION 'RLS assertion failed for table %', missing_rls_table;
	END IF;

	IF has_table_privilege('authenticated', 'public.users', 'UPDATE') THEN
		RAISE EXCEPTION 'Privilege assertion failed: authenticated has table-wide users UPDATE';
	END IF;

	IF NOT has_column_privilege('authenticated', 'public.users', 'full_name', 'UPDATE')
		OR has_column_privilege('authenticated', 'public.users', 'role', 'UPDATE')
		OR has_column_privilege('authenticated', 'public.users', 'is_active', 'UPDATE') THEN
		RAISE EXCEPTION 'Privilege assertion failed: users profile column grants are unsafe';
	END IF;

	IF has_function_privilege('authenticated', 'public.next_order_number()', 'EXECUTE') THEN
		RAISE EXCEPTION 'Privilege assertion failed: authenticated can execute next_order_number';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM storage.buckets
		WHERE id = 'product-images'
			AND public = true
			AND file_size_limit = 5242880
			AND allowed_mime_types @> ARRAY[
				'image/jpeg',
				'image/png',
				'image/webp'
			]::text[]
			AND cardinality(allowed_mime_types) = 3
	) THEN
		RAISE EXCEPTION 'Storage assertion failed: product-images bucket contract differs';
	END IF;
END
$$;
