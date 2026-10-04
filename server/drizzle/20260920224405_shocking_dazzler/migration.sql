CREATE TYPE "report_status" AS ENUM('open', 'reviewing', 'resolved', 'declined');--> statement-breakpoint
CREATE TYPE "report_type" AS ENUM('bug', 'feature');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"type" "report_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"email" varchar(255),
	"user_id" uuid,
	"status" "report_status" DEFAULT 'open'::"report_status" NOT NULL,
	"page_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_reports_type" ON "reports" ("type");--> statement-breakpoint
CREATE INDEX "idx_reports_status" ON "reports" ("status");--> statement-breakpoint
CREATE INDEX "idx_reports_created_at" ON "reports" ("created_at");--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;