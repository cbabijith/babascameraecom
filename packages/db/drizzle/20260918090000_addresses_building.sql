ALTER TABLE "addresses" ADD COLUMN "building" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_building_size" CHECK (char_length("building") <= 180);
