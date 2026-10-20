CREATE TYPE "highlight_color" AS ENUM('yellow', 'green', 'blue', 'pink', 'purple');--> statement-breakpoint
CREATE TABLE "memory_highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"memory_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"text" text NOT NULL,
	"prefix" text DEFAULT '' NOT NULL,
	"suffix" text DEFAULT '' NOT NULL,
	"color" "highlight_color" DEFAULT 'yellow'::"highlight_color" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "highlights_text" text;--> statement-breakpoint
CREATE INDEX "idx_memory_highlights_memory" ON "memory_highlights" ("memory_id");--> statement-breakpoint
CREATE INDEX "idx_memory_highlights_user" ON "memory_highlights" ("user_id");--> statement-breakpoint
ALTER TABLE "memory_highlights" ADD CONSTRAINT "memory_highlights_memory_id_memories_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memory_highlights" ADD CONSTRAINT "memory_highlights_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
-- The keyword search also reads what was highlighted (weighted like the summary).
CREATE OR REPLACE FUNCTION memories_fts_tokens_trigger() RETURNS trigger AS $$
BEGIN
  NEW.fts_tokens :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '') || ' ' || coalesce(NEW.inferred_intent, '') || ' ' || coalesce(NEW.highlights_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
