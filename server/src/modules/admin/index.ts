import { Router } from "express";
import usersRoutes from "./users/users.routes";
import analyticsRoutes from "./analytics/analytics.routes";
import auditLogRoutes from "./audit-log/audit-log.routes";
import plansRoutes from "./plans/plans.routes";
import emailRoutes from "./email/email.routes";
import systemRoutes from "./system/system.routes";

// Aggregates every admin sub-module onto one router, mounted at /api/v1/admin
// by ../../routes/index.ts. Each sub-module owns its own routes/controller/
// service/schema/validator files and is mounted at its own sub-path here —
// add a new admin surface by adding one more `router.use(...)` line, not by
// touching any existing sub-module.
//
// billing/coupons/credits/referrals removed along with the rest of this
// product's monetization — see server/src/modules/plans/ (kept: it's the
// mechanism that now grants everyone the single unlimited free plan, not a
// paid-tier system) and the sibling module deletions in the same change.
const router = Router();

router.use("/users", usersRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/audit-log", auditLogRoutes);
router.use("/plans", plansRoutes);
router.use("/emails", emailRoutes);
router.use("/system", systemRoutes);

export default router;
