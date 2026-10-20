CREATE TABLE "roadmap_votes" (
	"item_slug" varchar(60),
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmap_votes_pkey" PRIMARY KEY("item_slug","user_id")
);
--> statement-breakpoint
CREATE INDEX "idx_roadmap_votes_user_id" ON "roadmap_votes" ("user_id");--> statement-breakpoint
ALTER TABLE "roadmap_votes" ADD CONSTRAINT "roadmap_votes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;