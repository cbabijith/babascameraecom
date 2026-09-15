ALTER TABLE "home_banners" ADD COLUMN "same_media" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "home_banners" DROP CONSTRAINT IF EXISTS "home_banners_image_has_mobile";--> statement-breakpoint
ALTER TABLE "home_banners" ADD CONSTRAINT "home_banners_image_has_mobile" CHECK ("home_banners"."media_type" <> 'image' or "home_banners"."same_media" or "home_banners"."mobile_media_url" is not null);
