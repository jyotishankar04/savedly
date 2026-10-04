ALTER TABLE "collections" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "public_slug" varchar(32);--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "features" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_public_slug_key" UNIQUE("public_slug");