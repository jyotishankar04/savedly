-- Collections the AI created used to be stored as "system" and hidden from the
-- collections list by default. Everything is free now, so they are ordinary
-- collections: make the existing ones visible.
UPDATE "collections"
SET "source" = 'user', "converted_from_system_at" = now(), "updated_at" = now()
WHERE "source" = 'system';
