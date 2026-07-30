CREATE TYPE "public"."home_banner_media_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TABLE "home_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"internal_name" text NOT NULL,
	"media_type" "home_banner_media_type" NOT NULL,
	"desktop_media_url" text NOT NULL,
	"mobile_media_url" text,
	"poster_url" text,
	"alt_text" text NOT NULL,
	"headline" text,
	"subheading" text,
	"button_label" text,
	"destination_url" text,
	"open_in_new_tab" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	CONSTRAINT "home_banners_internal_name_not_blank" CHECK (length(trim("home_banners"."internal_name")) > 0),
	CONSTRAINT "home_banners_desktop_media_url_not_blank" CHECK (length(trim("home_banners"."desktop_media_url")) > 0),
	CONSTRAINT "home_banners_alt_text_not_blank" CHECK (length(trim("home_banners"."alt_text")) > 0),
	CONSTRAINT "home_banners_position_range" CHECK ("home_banners"."position" between 0 and 4),
	CONSTRAINT "home_banners_image_has_mobile" CHECK ("home_banners"."media_type" <> 'image' or "home_banners"."mobile_media_url" is not null),
	CONSTRAINT "home_banners_video_has_poster" CHECK ("home_banners"."media_type" <> 'video' or "home_banners"."poster_url" is not null),
	CONSTRAINT "home_banners_schedule_order" CHECK ("home_banners"."starts_at" is null or "home_banners"."ends_at" is null or "home_banners"."ends_at" > "home_banners"."starts_at"),
	CONSTRAINT "home_banners_destination_http_or_relative" CHECK ("home_banners"."destination_url" is null or "home_banners"."destination_url" ~ '^(https?://|/)')
);--> statement-breakpoint
CREATE UNIQUE INDEX "home_banners_position_unique" ON "home_banners" USING btree ("position");--> statement-breakpoint
CREATE INDEX "home_banners_active_schedule_idx" ON "home_banners" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint

ALTER TABLE "public"."home_banners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "home_banners_public_read_active"
	ON "public"."home_banners"
	FOR SELECT TO anon, authenticated
	USING (
		"is_active" = true
		AND ("starts_at" IS NULL OR "starts_at" <= now())
		AND ("ends_at" IS NULL OR "ends_at" > now())
	);--> statement-breakpoint
CREATE POLICY "home_banners_admin_all"
	ON "public"."home_banners"
	FOR ALL TO authenticated
	USING ((SELECT public.is_admin()))
	WITH CHECK ((SELECT public.is_admin()));--> statement-breakpoint
GRANT SELECT ON TABLE "public"."home_banners" TO anon;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."home_banners" TO authenticated;--> statement-breakpoint
GRANT ALL ON TABLE "public"."home_banners" TO service_role;--> statement-breakpoint

INSERT INTO "storage"."buckets" (
	"id",
	"name",
	"public",
	"file_size_limit",
	"allowed_mime_types"
)
VALUES (
	'home-banners',
	'home-banners',
	true,
	41943040,
	ARRAY['image/webp', 'video/mp4']::text[]
)
ON CONFLICT ("id") DO UPDATE
SET
	"name" = EXCLUDED."name",
	"public" = EXCLUDED."public",
	"file_size_limit" = EXCLUDED."file_size_limit",
	"allowed_mime_types" = EXCLUDED."allowed_mime_types";--> statement-breakpoint

CREATE POLICY "home_banners_storage_public_read"
	ON "storage"."objects"
	FOR SELECT TO PUBLIC
	USING ("bucket_id" = 'home-banners');--> statement-breakpoint
CREATE POLICY "home_banners_storage_admin_insert"
	ON "storage"."objects"
	FOR INSERT TO authenticated
	WITH CHECK (
		"bucket_id" = 'home-banners'
		AND (SELECT public.is_admin())
		AND lower("name") ~ '\.(webp|mp4)$'
	);--> statement-breakpoint
CREATE POLICY "home_banners_storage_admin_update"
	ON "storage"."objects"
	FOR UPDATE TO authenticated
	USING (
		"bucket_id" = 'home-banners'
		AND (SELECT public.is_admin())
	)
	WITH CHECK (
		"bucket_id" = 'home-banners'
		AND (SELECT public.is_admin())
		AND lower("name") ~ '\.(webp|mp4)$'
	);--> statement-breakpoint
CREATE POLICY "home_banners_storage_admin_delete"
	ON "storage"."objects"
	FOR DELETE TO authenticated
	USING (
		"bucket_id" = 'home-banners'
		AND (SELECT public.is_admin())
	);
