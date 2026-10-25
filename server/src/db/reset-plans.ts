import "dotenv/config";
import { resetPlanDefaults } from "../modules/admin/plans/plans.service";

// `pnpm db:plans:reset`: moves a database onto the current default plans; prices and active/default
// switches are left as set.
resetPlanDefaults()
  .then((keys) => {
    console.log(`Plan defaults applied: ${keys.join(", ")}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Plan reset failed:", err);
    process.exit(1);
  });
