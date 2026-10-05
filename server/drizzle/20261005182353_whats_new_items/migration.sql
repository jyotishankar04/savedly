CREATE TYPE "whats_new_kind" AS ENUM('new', 'improved', 'upcoming');--> statement-breakpoint
CREATE TABLE "whats_new_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"kind" "whats_new_kind" DEFAULT 'new'::"whats_new_kind" NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" text,
	"bullets" jsonb DEFAULT '[]' NOT NULL,
	"image_url" text,
	"cta_label" varchar(60),
	"cta_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_whats_new_items_active_order" ON "whats_new_items" ("is_active","sort_order");--> statement-breakpoint
ALTER TABLE "whats_new_items" ADD CONSTRAINT "whats_new_items_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;