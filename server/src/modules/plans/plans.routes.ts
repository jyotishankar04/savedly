import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { PlansController } from "./plans.controller";

// Mounted at /plans by routes/index.ts. / is the public pricing list; /me
// needs auth. Admin CRUD on plans/plan_limits lives in modules/admin/plans,
// which imports this module's service functions rather than re-querying.
const router = Router();

router.get("/", PlansController.listPublic);
router.get("/me", authenticate, PlansController.me);

export default router;
