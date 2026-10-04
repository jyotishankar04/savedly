-- Data-only migration: moves the old collections.is_public / public_slug
-- sharing model into the new `shares` table.
--
-- Slugs carry over verbatim, so every /c/<slug> link already handed out
-- keeps resolving (the client redirects /c/:slug -> /s/:slug).
--
-- A collection with a slug but is_public = false becomes 'disabled' rather
-- than being skipped: that is exactly what the old code meant by "unshared
-- but keep the slug so re-sharing reuses the same link".
--
-- allow_search_indexing is false for every migrated row. That is a
-- deliberate behaviour change — public pages are now noindex unless the
-- owner opts in per share.
INSERT INTO "shares" (
  "id", "owner_id", "resource_type", "collection_id", "slug",
  "link_access", "allow_search_indexing", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  c."user_id",
  'collection',
  c."id",
  c."public_slug",
  CASE WHEN c."is_public" THEN 'public'::"share_link_access" ELSE 'disabled'::"share_link_access" END,
  false,
  c."created_at",
  now()
FROM "collections" c
WHERE c."public_slug" IS NOT NULL
ON CONFLICT ("slug") DO NOTHING;
