CREATE TABLE "github_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"github_user_id" varchar(64) NOT NULL,
	"login" varchar(100) NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"last_starred_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"needs_reconnect" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_github_connections_user" ON "github_connections" ("user_id");--> statement-breakpoint
ALTER TABLE "github_connections" ADD CONSTRAINT "github_connections_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;