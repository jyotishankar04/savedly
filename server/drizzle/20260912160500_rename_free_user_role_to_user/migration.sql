-- Data-only migration: stop encoding billing tier in RBAC role names.
--
-- Roles and plans are separate systems, but the roles were seeded with
-- tier-shaped names from before billing existed. The result was that tier
-- lived in two places — `plans` (real, enforced) and `roles` (vestigial,
-- never read) — which is what made a Pro subscriber render as "FREE USER".
--
-- Only `admin` is ever checked anywhere in the codebase (require-admin.ts);
-- the other role is just "a signed-in person", so it should say so.

-- free_user -> user. Existing user_roles rows point at the role by id, so
-- every assignment follows the rename automatically.
UPDATE "roles" SET "name" = 'user', "description" = 'Default role granted to every new user on signup'
WHERE "name" = 'free_user';

-- pro_user was seeded but never granted to anyone, and nothing reads it.
-- Guarded anyway: if some deployment did assign it, keep the row rather
-- than silently stripping someone's role.
DELETE FROM "roles"
WHERE "name" = 'pro_user'
  AND NOT EXISTS (SELECT 1 FROM "user_roles" ur WHERE ur."role_id" = "roles"."id");
