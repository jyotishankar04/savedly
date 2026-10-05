import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { requireAdmin } from "../../shared/middlewares/require-admin";
import { WhatsNewController } from "./whats-new.controller";
import { validateCreateWhatsNew, validateReorderWhatsNew, validateUpdateWhatsNew } from "./whats-new.validator";

// Mounted at /admin/whats-new.
const router = Router();

router.get("/", authenticate, requireAdmin, WhatsNewController.list);
router.post("/", authenticate, requireAdmin, validateCreateWhatsNew, WhatsNewController.create);
router.put("/order", authenticate, requireAdmin, validateReorderWhatsNew, WhatsNewController.reorder);
router.patch("/:id", authenticate, requireAdmin, validateUpdateWhatsNew, WhatsNewController.update);
router.delete("/:id", authenticate, requireAdmin, WhatsNewController.remove);

export default router;
