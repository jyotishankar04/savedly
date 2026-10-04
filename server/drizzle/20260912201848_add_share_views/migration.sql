CREATE TABLE "share_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"share_id" uuid NOT NULL,
	"viewer_user_id" uuid,
	"viewer_ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_share_views_share_created" ON "share_views" ("share_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_share_views_share_viewer" ON "share_views" ("share_id","viewer_user_id");--> statement-breakpoint
CREATE INDEX "idx_share_views_share_ip" ON "share_views" ("share_id","viewer_ip_hash");--> statement-breakpoint
ALTER TABLE "share_views" ADD CONSTRAINT "share_views_share_id_shares_id_fkey" FOREIGN KEY ("share_id") REFERENCES "shares"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "share_views" ADD CONSTRAINT "share_views_viewer_user_id_users_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL;