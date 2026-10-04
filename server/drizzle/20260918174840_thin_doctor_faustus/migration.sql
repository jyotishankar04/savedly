CREATE TYPE "import_item_status" AS ENUM('created', 'skipped_duplicate', 'failed');--> statement-breakpoint
CREATE TYPE "import_source_type" AS ENUM('bookmarks_html', 'url_list');--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"source_type" "import_source_type" NOT NULL,
	"total_count" integer NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"batch_id" uuid NOT NULL,
	"url" text NOT NULL,
	"status" "import_item_status" NOT NULL,
	"memory_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_import_batches_user_created" ON "import_batches" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_import_items_batch_status" ON "import_items" ("batch_id","status");--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_batch_id_import_batches_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_memory_id_memories_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE SET NULL;