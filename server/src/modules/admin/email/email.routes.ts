import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireAdmin } from "../../../shared/middlewares/require-admin";
import { AdminEmailController } from "./email.controller";
import { validateListCampaignMessages, validateListCampaigns, validateSendEmail } from "./email.validator";

// Mounted at /admin/emails by ../index.ts.
const router = Router();

router.post("/send", authenticate, requireAdmin, validateSendEmail, AdminEmailController.send);
router.get("/", authenticate, requireAdmin, validateListCampaigns, AdminEmailController.list);
router.get("/:id/messages", authenticate, requireAdmin, validateListCampaignMessages, AdminEmailController.messages);

export default router;
