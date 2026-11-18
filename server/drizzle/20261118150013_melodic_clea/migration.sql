CREATE TABLE "reddit_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"reddit_username" varchar(100) NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"last_item_fullname" varchar(64),
	"last_saved_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"needs_reconnect" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reddit_connections_user" ON "reddit_connections" ("user_id");--> statement-breakpoint
ALTER TABLE "reddit_connections" ADD CONSTRAINT "reddit_connections_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;