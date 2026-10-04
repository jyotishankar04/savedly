ALTER TABLE "collections" ADD COLUMN "is_vaulted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "is_vaulted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vault_pin_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vault_pin_updated_at" timestamp with time zone;