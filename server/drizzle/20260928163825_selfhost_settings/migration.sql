CREATE TABLE "instance_settings" (
	"section" varchar(50) PRIMARY KEY,
	"value" jsonb DEFAULT '{}' NOT NULL,
	"secret_value" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD CONSTRAINT "instance_settings_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;