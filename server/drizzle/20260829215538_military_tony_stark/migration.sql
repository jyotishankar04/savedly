-- Must run before the vector/tsvector columns below. pgvector is only needed
-- when Postgres is the vector store (VECTOR_STORE_PROVIDER=pgvector, the
-- default). With Upstash Vector or Pinecone the two embedding columns stay
-- empty, so on a Postgres that doesn't offer the extension they're created
-- as plain real[] columns instead and the HNSW indexes are skipped.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
		CREATE EXTENSION IF NOT EXISTS vector;
	END IF;
	IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_trgm') THEN
		CREATE EXTENSION IF NOT EXISTS pg_trgm;
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "memory_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"memory_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_content" text NOT NULL,
	"token_count" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
		ALTER TABLE "memory_chunks" ADD COLUMN "embedding" vector(1536) NOT NULL;
		ALTER TABLE "memories" ADD COLUMN "document_embedding" vector(1536);
	ELSE
		ALTER TABLE "memory_chunks" ADD COLUMN "embedding" real[] NOT NULL;
		ALTER TABLE "memories" ADD COLUMN "document_embedding" real[];
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "fts_tokens" tsvector;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "resource_category" text;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "inferred_intent" text;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "intent_confidence" real;--> statement-breakpoint
CREATE INDEX "idx_memory_chunks_user_memory" ON "memory_chunks" ("user_id","memory_id");--> statement-breakpoint
ALTER TABLE "memory_chunks" ADD CONSTRAINT "memory_chunks_memory_id_memories_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memory_chunks" ADD CONSTRAINT "memory_chunks_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint

-- HNSW indexes for cosine-similarity search (docs/AI_REQUIREMENTS.md's tuning).
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
		CREATE INDEX "idx_memories_document_embedding" ON "memories" USING hnsw ("document_embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);
		CREATE INDEX "idx_memory_chunks_embedding" ON "memory_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);
	END IF;
END $$;--> statement-breakpoint

-- Full-text search: fts_tokens is trigger-populated, weighted A=title,
-- B=description+inferred_intent, C=content — the app never writes this
-- column directly (see the tsvector customType in pgvector-type.ts).
CREATE INDEX "idx_memories_fts_tokens" ON "memories" USING gin ("fts_tokens");--> statement-breakpoint

CREATE OR REPLACE FUNCTION memories_fts_tokens_trigger() RETURNS trigger AS $$
BEGIN
  NEW.fts_tokens :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '') || ' ' || coalesce(NEW.inferred_intent, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER memories_fts_tokens_update
  BEFORE INSERT OR UPDATE ON "memories"
  FOR EACH ROW EXECUTE FUNCTION memories_fts_tokens_trigger();