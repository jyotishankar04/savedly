ALTER TABLE "memories" ADD COLUMN "trashed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_memories_trashed_at" ON "memories" ("trashed_at") WHERE "in_trash" = true;