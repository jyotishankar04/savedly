ALTER TYPE "email_template_key" ADD VALUE 'memory_reminder';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'memory_reminder';--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "remind_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "reminded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "notify_reminder_emails" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_memories_remind_at" ON "memories" ("remind_at") WHERE "remind_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_memories_user_unread" ON "memories" ("user_id","created_at") WHERE "read_at" IS NULL;--> statement-breakpoint
-- Start clean: everything saved before the Inbox existed counts as read, so it fills from new saves only.
UPDATE "memories" SET "read_at" = "created_at" WHERE "read_at" IS NULL;
