CREATE TYPE "email_category" AS ENUM('transactional', 'marketing', 'alert', 'announcement', 'custom');--> statement-breakpoint
CREATE TYPE "email_status" AS ENUM('queued', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "email_template_key" AS ENUM('welcome', 'user_status_changed', 'share_invite', 'share_access_requested', 'share_access_approved', 'share_access_denied', 'admin_custom');--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"category" "email_category" NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body_text" text NOT NULL,
	"recipient_filter" jsonb NOT NULL,
	"recipient_count" integer NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"campaign_id" uuid,
	"recipient_user_id" uuid,
	"recipient_email" varchar(255) NOT NULL,
	"category" "email_category" NOT NULL,
	"template_key" "email_template_key" NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body_html" text NOT NULL,
	"status" "email_status" DEFAULT 'queued'::"email_status" NOT NULL,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_created" ON "email_campaigns" ("created_at");--> statement-breakpoint
CREATE INDEX "idx_email_messages_campaign" ON "email_messages" ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_email_messages_recipient_user" ON "email_messages" ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "idx_email_messages_status_created" ON "email_messages" ("status","created_at");--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_campaign_id_email_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaigns"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_recipient_user_id_users_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL;