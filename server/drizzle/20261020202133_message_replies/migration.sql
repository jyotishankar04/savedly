CREATE TABLE "message_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"kind" varchar(16) NOT NULL,
	"target_id" uuid NOT NULL,
	"admin_user_id" uuid,
	"to_email" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_message_replies_target" ON "message_replies" ("kind","target_id","created_at");--> statement-breakpoint
ALTER TABLE "message_replies" ADD CONSTRAINT "message_replies_admin_user_id_users_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL;