-- Data-only migration: brings EXISTING plan rows up to date with the new
-- sharing entitlements.
--
-- seedDefaultPlans() is deliberately onConflictDoNothing, so it will never
-- touch a plan an admin may have edited. That means changing DEFAULT_PLANS
-- has no effect on a database that has already been seeded — the values
-- below have to be applied explicitly, once.
--
-- Both statements are idempotent, so re-running is harmless.

-- Sharing modes that cost money. `publicCollections` is retired: publishing
-- is now free and capped by the public_share_count limit instead.
UPDATE "plans"
SET "features" = ("features" - 'publicCollections')
              || '{"directShares": true, "privateShareRequests": true, "passwordProtectedShares": true}'::jsonb
WHERE "key" IN ('plus', 'pro');

UPDATE "plans"
SET "features" = "features" - 'publicCollections'
WHERE "key" = 'free';

-- How many links each plan may have set to "public" at once.
-- NULL limit_value means unlimited.
INSERT INTO "plan_limits" ("plan_id", "limit_type", "limit_value")
SELECT p."id", 'public_share_count'::"plan_limit_type",
       CASE p."key" WHEN 'free' THEN 3 WHEN 'plus' THEN 25 ELSE NULL END
FROM "plans" p
WHERE p."key" IN ('free', 'plus', 'pro')
ON CONFLICT ("plan_id", "limit_type") DO NOTHING;
