import "dotenv/config";
import { resetPlanDefaults } from "../modules/admin/plans/plans.service";

// `pnpm db:plans:reset` — moves an existing database onto the current default
// plans (names, descriptions, limits; inserts missing plans). Prices and the
// active/default switches are left exactly as an admin set them.
resetPlanDefaults()
  .then((keys) => {
    console.log(`Plan defaults applied: ${keys.join(", ")}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Plan reset failed:", err);
    process.exit(1);
  });
