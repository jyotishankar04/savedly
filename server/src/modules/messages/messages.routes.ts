import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { requireAdmin } from "../../shared/middlewares/require-admin";
import { MessagesController } from "./messages.controller";
import { validateId, validateListContact, validateListReports, validateUpdateContact, validateUpdateReport } from "./messages.validator";

// Mounted at /admin/messages: Admin > Messages.
const router = Router();
router.use(authenticate, requireAdmin);

router.get("/counts", MessagesController.counts);
router.get("/contact", validateListContact, MessagesController.listContact);
router.patch("/contact/:id", validateId, validateUpdateContact, MessagesController.updateContact);
router.delete("/contact/:id", validateId, MessagesController.removeContact);
router.get("/reports", validateListReports, MessagesController.listReports);
router.patch("/reports/:id", validateId, validateUpdateReport, MessagesController.updateReport);
router.delete("/reports/:id", validateId, MessagesController.removeReport);

export default router;
