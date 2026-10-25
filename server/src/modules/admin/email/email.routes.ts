import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireAdmin } from "../../../shared/middlewares/require-admin";
import { AdminEmailController } from "./email.controller";
import { validateListCampaignMessages, validateListCampaigns, validatePreviewEmail, validateSendEmail } from "./email.validator";

const router = Router();

router.post("/send", authenticate, requireAdmin, validateSendEmail, AdminEmailController.send);
// The composer: render what would be sent, and send it to yourself first.
router.post("/preview", authenticate, requireAdmin, validatePreviewEmail, AdminEmailController.preview);
router.post("/test", authenticate, requireAdmin, validatePreviewEmail, AdminEmailController.sendTest);
// The weekly email of things to read, sent to yourself now with your own Inbox, whatever the day.
router.post("/weekly-digest/test", authenticate, requireAdmin, AdminEmailController.sendWeeklyDigestTest);
router.get("/", authenticate, requireAdmin, validateListCampaigns, AdminEmailController.list);
router.get("/:id/messages", authenticate, requireAdmin, validateListCampaignMessages, AdminEmailController.messages);

export default router;
