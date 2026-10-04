CREATE TYPE "calendar_provider" AS ENUM('google', 'microsoft');--> statement-breakpoint
ALTER TYPE "email_template_key" ADD VALUE 'event_detected';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'event_detected';--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"scope" text NOT NULL,
	"provider_account_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_event_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"memory_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"external_event_id" text NOT NULL,
	"external_html_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "suggested_event_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "event_detection_confidence" real;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_calendar_connections_user_provider" ON "calendar_connections" ("user_id","provider");--> statement-breakpoint
CREATE INDEX "idx_calendar_connections_user_id" ON "calendar_connections" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_calendar_event_links_memory_provider" ON "calendar_event_links" ("memory_id","provider");--> statement-breakpoint
CREATE INDEX "idx_calendar_event_links_user_id" ON "calendar_event_links" ("user_id");--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_event_links" ADD CONSTRAINT "calendar_event_links_memory_id_memories_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_event_links" ADD CONSTRAINT "calendar_event_links_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;