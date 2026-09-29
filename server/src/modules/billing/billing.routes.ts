import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { BillingController } from "./billing.controller";
import { validateCheckout, validateUpgradePreview } from "./billing.validator";

// Mounted at /billing by ../../routes/index.ts — hosted only, never on a
// self-hosted install.
const router = Router();

router.post("/checkout", authenticate, validateCheckout, BillingController.checkout);
// What a subscriber's upgrade will charge now, shown before they confirm.
router.post("/upgrade-preview", authenticate, validateUpgradePreview, BillingController.upgradePreview);
router.post("/portal", authenticate, BillingController.portal);
// Pulls the user's subscriptions from the provider, for when a webhook is late.
router.post("/sync", authenticate, BillingController.sync);
// No authenticate — the payment provider calls this; the signature is the auth.
router.post("/webhook", BillingController.webhook);

export default router;
