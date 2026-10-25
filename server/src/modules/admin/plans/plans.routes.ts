import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireAdmin } from "../../../shared/middlewares/require-admin";
import { AdminPlansController } from "./plans.controller";
import { validateCreatePlan, validateUpdatePlan } from "./plans.validator";

// Mounted at /admin/plans. No delete route: plans are retired with isActive: false, since
// assignments reference them.
const router = Router();

router.get("/", authenticate, requireAdmin, AdminPlansController.list);
router.get("/grants/summary", authenticate, requireAdmin, AdminPlansController.grantsSummary);
router.post("/", authenticate, requireAdmin, validateCreatePlan, AdminPlansController.create);
router.patch("/:id", authenticate, requireAdmin, validateUpdatePlan, AdminPlansController.update);

export default router;
