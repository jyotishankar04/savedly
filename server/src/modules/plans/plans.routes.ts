import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { PlansController } from "./plans.controller";

// Mounted at /plans. / is the public pricing list; /me needs auth. Admin CRUD is in
// modules/admin/plans, which reuses this module's services.
const router = Router();

router.get("/", PlansController.listPublic);
router.get("/me", authenticate, PlansController.me);

export default router;
