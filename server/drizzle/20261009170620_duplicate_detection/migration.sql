ALTER TYPE "notification_type" ADD VALUE 'duplicate_detected';--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "duplicate_status" varchar(16);--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "duplicate_of_id" uuid;--> statement-breakpoint
-- Everything saved before this feature counts as already checked. Otherwise
-- the next time an old memory is re-processed (after an edit, say) it would
-- be flagged as a duplicate of something saved years ago.
UPDATE "memories" SET "duplicate_status" = 'none' WHERE "duplicate_status" IS NULL;
