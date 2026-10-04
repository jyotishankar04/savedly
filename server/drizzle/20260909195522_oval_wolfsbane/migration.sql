CREATE TYPE "collection_source" AS ENUM('user', 'system');--> statement-breakpoint
CREATE TYPE "coupon_discount_type" AS ENUM('percentage', 'fixed_amount');--> statement-breakpoint
CREATE TYPE "coupon_redemption_status" AS ENUM('applied', 'converted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "credit_ledger_reason" AS ENUM('referral_reward', 'admin_adjustment', 'promotion', 'expiration');--> statement-breakpoint
CREATE TYPE "plan_assignment_source" AS ENUM('admin_manual', 'signup_default', 'referral_reward', 'coupon_redemption', 'payment');--> statement-breakpoint
CREATE TYPE "plan_assignment_status" AS ENUM('active', 'expired', 'cancelled', 'superseded');--> statement-breakpoint
CREATE TYPE "plan_billing_interval" AS ENUM('monthly', 'yearly', 'one_time');--> statement-breakpoint
CREATE TYPE "plan_limit_type" AS ENUM('memory_count', 'ai_monthly_queries', 'storage_mb', 'collection_count');--> statement-breakpoint
CREATE TYPE "referral_code_type" AS ENUM('user', 'admin_issued');--> statement-breakpoint
CREATE TYPE "referral_conversion_stage" AS ENUM('applied', 'converted');--> statement-breakpoint
CREATE TYPE "transaction_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "transaction_type" AS ENUM('subscription_purchase', 'subscription_renewal', 'upgrade', 'downgrade', 'refund', 'admin_grant');--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"coupon_id" uuid NOT NULL,
	"user_id" uuid,
	"status" "coupon_redemption_status" DEFAULT 'applied'::"coupon_redemption_status" NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_at" timestamp with time zone,
	"transaction_id" uuid,
	"discount_amount_minor" integer,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(50) NOT NULL UNIQUE,
	"label" varchar(150),
	"discount_type" "coupon_discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"applicable_plan_id" uuid,
	"max_redemptions" integer,
	"max_redemptions_per_user" integer DEFAULT 1 NOT NULL,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"amount" integer NOT NULL,
	"reason" "credit_ledger_reason" NOT NULL,
	"reference_type" varchar(50),
	"reference_id" varchar(255),
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan_id" uuid NOT NULL,
	"limit_type" "plan_limit_type" NOT NULL,
	"limit_value" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" varchar(50) NOT NULL UNIQUE,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price_minor" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'inr' NOT NULL,
	"billing_interval" "plan_billing_interval" DEFAULT 'monthly'::"plan_billing_interval" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(50) NOT NULL UNIQUE,
	"type" "referral_code_type" DEFAULT 'user'::"referral_code_type" NOT NULL,
	"owner_user_id" uuid,
	"reward_credits_amount" integer NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"referral_code_id" uuid NOT NULL,
	"referred_user_id" uuid,
	"stage" "referral_conversion_stage" DEFAULT 'applied'::"referral_conversion_stage" NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_at" timestamp with time zone,
	"transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"plan_id" uuid,
	"plan_assignment_id" uuid,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending'::"transaction_status" NOT NULL,
	"amount_minor" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'inr' NOT NULL,
	"provider" varchar(50),
	"provider_ref" varchar(255),
	"metadata" jsonb,
	"initiated_by" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_credit_balances" (
	"user_id" uuid PRIMARY KEY,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_plan_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"plan_id" uuid NOT NULL,
	"status" "plan_assignment_status" DEFAULT 'active'::"plan_assignment_status" NOT NULL,
	"source" "plan_assignment_source" NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"assigned_by" uuid,
	"reason" text,
	"source_ref_type" varchar(50),
	"source_ref_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "source" "collection_source" DEFAULT 'user'::"collection_source" NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "converted_from_system_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_collections_user_source" ON "collections" ("user_id","source");--> statement-breakpoint
CREATE INDEX "idx_coupon_redemptions_coupon_id" ON "coupon_redemptions" ("coupon_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_redemptions_user_id" ON "coupon_redemptions" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_redemptions_status" ON "coupon_redemptions" ("status");--> statement-breakpoint
CREATE INDEX "idx_coupon_redemptions_transaction_id" ON "coupon_redemptions" ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_coupons_active" ON "coupons" ("is_active");--> statement-breakpoint
CREATE INDEX "idx_credit_ledger_user_created" ON "credit_ledger" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_credit_ledger_reference" ON "credit_ledger" ("reference_type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_plan_limits_plan_type" ON "plan_limits" ("plan_id","limit_type");--> statement-breakpoint
CREATE INDEX "idx_plans_active_sort" ON "plans" ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "idx_referral_codes_type" ON "referral_codes" ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_referral_conversions_referred_user" ON "referral_conversions" ("referred_user_id");--> statement-breakpoint
CREATE INDEX "idx_referral_conversions_code_id" ON "referral_conversions" ("referral_code_id");--> statement-breakpoint
CREATE INDEX "idx_referral_conversions_stage" ON "referral_conversions" ("stage");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_occurred" ON "transactions" ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_status" ON "transactions" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_transactions_provider_ref" ON "transactions" ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "idx_user_plan_assignments_user_status" ON "user_plan_assignments" ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_user_plan_assignments_ends_at" ON "user_plan_assignments" ("ends_at");--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_transaction_id_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_applicable_plan_id_plans_id_fkey" FOREIGN KEY ("applicable_plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "plan_limits" ADD CONSTRAINT "plan_limits_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_owner_user_id_users_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referral_code_id_referral_codes_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "referral_codes"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referred_user_id_users_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_transaction_id_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_plan_assignment_id_user_plan_assignments_id_fkey" FOREIGN KEY ("plan_assignment_id") REFERENCES "user_plan_assignments"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_initiated_by_users_id_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "user_credit_balances" ADD CONSTRAINT "user_credit_balances_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_plan_assignments" ADD CONSTRAINT "user_plan_assignments_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "user_plan_assignments" ADD CONSTRAINT "user_plan_assignments_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "user_plan_assignments" ADD CONSTRAINT "user_plan_assignments_assigned_by_users_id_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL;