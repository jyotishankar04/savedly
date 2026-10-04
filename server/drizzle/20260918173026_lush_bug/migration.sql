ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_users_deleted_at" ON "users" ("deleted_at") WHERE "status" = 'deleted';