import { db } from "./index";
import { roles } from "./schema";
import { seedDefaultFlags } from "../modules/feature-flags/feature-flags.service";
import { seedDefaultPlans } from "../modules/admin/plans/plans.service";

// Access levels only; billing tiers live in `plans`, so a role named after a tier would be a second
// source of truth.
const defaultRoles = [
  { name: "user", description: "Default role granted to every new user on signup", isSystem: true },
  { name: "admin", description: "Full administrative access", isSystem: true },
];

export async function seedRoles() {
  await db.insert(roles).values(defaultRoles).onConflictDoNothing({ target: roles.name });
}

/** The rows the app can't run without (roles, flags, plans); idempotent, so it runs every boot. */
export async function seedCore() {
  await seedRoles();
  await seedDefaultFlags();
  await seedDefaultPlans();
}
