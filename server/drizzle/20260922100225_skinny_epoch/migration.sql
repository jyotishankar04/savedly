-- 'semi_annual' already exists on the live plan_billing_interval enum
-- (added out-of-band from an earlier commit) — drizzle's tracked snapshot
-- history just didn't know that, so its auto-generated ADD VALUE here was
-- redundant and failed with 42710 duplicate_object on first apply. Dropped
-- from this migration; schema.ts already declares it, so no future
-- `drizzle-kit generate` should try to add it again.
ALTER TABLE "coupon_redemptions" DROP CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fkey";--> statement-breakpoint
ALTER TABLE "coupon_redemptions" DROP CONSTRAINT "coupon_redemptions_transaction_id_transactions_id_fkey";--> statement-breakpoint
ALTER TABLE "referral_conversions" DROP CONSTRAINT "referral_conversions_referral_code_id_referral_codes_id_fkey";--> statement-breakpoint
ALTER TABLE "referral_conversions" DROP CONSTRAINT "referral_conversions_transaction_id_transactions_id_fkey";--> statement-breakpoint
DROP TABLE "coupon_redemptions";--> statement-breakpoint
DROP TABLE "coupons";--> statement-breakpoint
DROP TABLE "credit_ledger";--> statement-breakpoint
DROP TABLE "referral_codes";--> statement-breakpoint
DROP TABLE "referral_conversions";--> statement-breakpoint
DROP TABLE "transactions";--> statement-breakpoint
DROP TABLE "user_credit_balances";--> statement-breakpoint
ALTER TABLE "user_plan_assignments" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "plan_assignment_source";--> statement-breakpoint
CREATE TYPE "plan_assignment_source" AS ENUM('admin_manual', 'signup_default');--> statement-breakpoint
ALTER TABLE "user_plan_assignments" ALTER COLUMN "source" SET DATA TYPE "plan_assignment_source" USING "source"::"plan_assignment_source";--> statement-breakpoint
DROP TYPE "coupon_discount_type";--> statement-breakpoint
DROP TYPE "coupon_redemption_status";--> statement-breakpoint
DROP TYPE "credit_ledger_reason";--> statement-breakpoint
DROP TYPE "referral_code_type";--> statement-breakpoint
DROP TYPE "referral_conversion_stage";--> statement-breakpoint
DROP TYPE "transaction_status";--> statement-breakpoint
DROP TYPE "transaction_type";