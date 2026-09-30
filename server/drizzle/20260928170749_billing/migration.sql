ALTER TYPE "plan_assignment_source" ADD VALUE 'subscription';--> statement-breakpoint
CREATE TABLE "billing_customers" (
	"user_id" uuid PRIMARY KEY,
	"provider" varchar(30) NOT NULL,
	"customer_id" varchar(255) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" varchar(255) PRIMARY KEY,
	"provider" varchar(30) NOT NULL,
	"type" varchar(100) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;