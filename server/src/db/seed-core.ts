import { db } from "./index";
import { roles } from "./schema";
import { seedDefaultFlags } from "../modules/feature-flags/feature-flags.service";
import { seedDefaultPlans } from "../modules/admin/plans/plans.service";

// Access levels only — billing tier lives in `plans`, never here. A role
// named after a paid tier would be a second, unenforced source of truth
// for what someone has paid for.
const defaultRoles = [
  { name: "user", description: "Default role granted to every new user on signup", isSystem: true },
  { name: "admin", description: "Full administrative access", isSystem: true },
];

export async function seedRoles() {
  await db.insert(roles).values(defaultRoles).onConflictDoNothing({ target: roles.name });
}

/**
 * The rows the app can't run without — roles, default feature flags, default
 * plans. Idempotent (every insert is onConflictDoNothing), so it's safe to run
 * on every boot; the self-hosted container does exactly that (bootstrap.ts).
 */
export async function seedCore() {
  await seedRoles();
  await seedDefaultFlags();
  await seedDefaultPlans();
}
