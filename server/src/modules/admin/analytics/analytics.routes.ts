import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireAdmin } from "../../../shared/middlewares/require-admin";
import { AnalyticsController } from "./analytics.controller";
import { validateAnalyticsRange } from "./analytics.validator";

// Mounted at /admin/analytics by ../index.ts.
const router = Router();

router.get("/signups", authenticate, requireAdmin, validateAnalyticsRange, AnalyticsController.signupsOverTime);
router.get("/active-users", authenticate, requireAdmin, validateAnalyticsRange, AnalyticsController.activeUsers);
router.get("/content-growth", authenticate, requireAdmin, validateAnalyticsRange, AnalyticsController.contentGrowth);

export default router;
