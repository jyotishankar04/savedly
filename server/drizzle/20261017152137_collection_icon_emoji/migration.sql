ALTER TABLE "collections" ALTER COLUMN "icon" SET DEFAULT '📁';--> statement-breakpoint
-- Icons saved as names ("folder-outline", from the old default or the assistant) show as text in the apps: make them the folder emoji.
UPDATE "collections" SET "icon" = '📁' WHERE "icon" ~ '^[A-Za-z0-9_-]*$';
