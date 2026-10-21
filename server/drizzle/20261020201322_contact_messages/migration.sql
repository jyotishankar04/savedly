CREATE TYPE "contact_message_status" AS ENUM('new', 'read', 'replied', 'archived');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"topic" varchar(40) NOT NULL,
	"message" text NOT NULL,
	"status" "contact_message_status" DEFAULT 'new'::"contact_message_status" NOT NULL,
	"user_id" uuid,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_contact_messages_status_created" ON "contact_messages" ("status","created_at");--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;