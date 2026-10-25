import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { requireAdmin } from "../../shared/middlewares/require-admin";
import { MessagesController } from "./messages.controller";
import { validateId, validateKindId, validateListContact, validateListReports, validateReply, validateUpdateContact, validateUpdateReport } from "./messages.validator";

const router = Router();
router.use(authenticate, requireAdmin);

router.get("/counts", MessagesController.counts);
router.get("/contact", validateListContact, MessagesController.listContact);
router.patch("/contact/:id", validateId, validateUpdateContact, MessagesController.updateContact);
router.delete("/contact/:id", validateId, MessagesController.removeContact);
router.get("/reports", validateListReports, MessagesController.listReports);
router.patch("/reports/:id", validateId, validateUpdateReport, MessagesController.updateReport);
router.delete("/reports/:id", validateId, MessagesController.removeReport);
// The conversation with someone who wrote in, and replying to them by email.
router.get("/:kind/:id/replies", validateKindId, MessagesController.replies);
router.post("/:kind/:id/replies", validateKindId, validateReply, MessagesController.reply);

export default router;
