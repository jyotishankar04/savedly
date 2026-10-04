CREATE TYPE "ai_credential_provider" AS ENUM('openai', 'anthropic', 'groq', 'google', 'custom');--> statement-breakpoint
CREATE TYPE "ai_role" AS ENUM('fast', 'reasoning', 'vision', 'embeddings');--> statement-breakpoint
CREATE TABLE "ai_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"provider" "ai_credential_provider" NOT NULL,
	"label" varchar(100) NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"base_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ai_role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"role" "ai_role" NOT NULL,
	"credential_id" uuid NOT NULL,
	"model" varchar(150) NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_ai_credentials_user_id" ON "ai_credentials" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_ai_role_assignments_user_role" ON "user_ai_role_assignments" ("user_id","role");--> statement-breakpoint
CREATE INDEX "idx_user_ai_role_assignments_user_id" ON "user_ai_role_assignments" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_ai_role_assignments_credential_id" ON "user_ai_role_assignments" ("credential_id");--> statement-breakpoint
ALTER TABLE "ai_credentials" ADD CONSTRAINT "ai_credentials_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_ai_role_assignments" ADD CONSTRAINT "user_ai_role_assignments_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_ai_role_assignments" ADD CONSTRAINT "user_ai_role_assignments_credential_id_ai_credentials_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "ai_credentials"("id") ON DELETE CASCADE;