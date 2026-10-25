import { Router } from "express";
import usersRoutes from "./users/users.routes";
import analyticsRoutes from "./analytics/analytics.routes";
import auditLogRoutes from "./audit-log/audit-log.routes";
import plansRoutes from "./plans/plans.routes";
import emailRoutes from "./email/email.routes";
import systemRoutes from "./system/system.routes";

// Aggregates the admin sub-modules at /api/v1/admin; add a surface with one more router.use line.
const router = Router();

router.use("/users", usersRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/audit-log", auditLogRoutes);
router.use("/plans", plansRoutes);
router.use("/emails", emailRoutes);
router.use("/system", systemRoutes);

export default router;
