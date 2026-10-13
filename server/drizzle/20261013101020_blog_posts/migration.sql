CREATE TYPE "blog_post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" varchar(160) NOT NULL UNIQUE,
	"title" varchar(200) NOT NULL,
	"excerpt" text,
	"content" text DEFAULT '' NOT NULL,
	"cover_image_url" text,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"status" "blog_post_status" DEFAULT 'draft'::"blog_post_status" NOT NULL,
	"author_name" varchar(120),
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_blog_posts_status_published" ON "blog_posts" ("status","published_at");--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;