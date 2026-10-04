ALTER TABLE "collections" DROP CONSTRAINT "collections_public_slug_key";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "is_public";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "public_slug";