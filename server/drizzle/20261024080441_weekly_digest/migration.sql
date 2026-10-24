ALTER TYPE "email_template_key" ADD VALUE 'weekly_digest';--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "weekly_digest_sent_at" timestamp with time zone;