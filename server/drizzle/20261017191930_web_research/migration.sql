ALTER TYPE "plan_limit_type" ADD VALUE 'web_search_monthly';--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "web_research" jsonb;