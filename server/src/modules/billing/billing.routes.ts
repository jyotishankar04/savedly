import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { BillingController } from "./billing.controller";
import { validateCheckout } from "./billing.validator";

// Mounted at /billing by ../../routes/index.ts — hosted only, never on a
// self-hosted install.
const router = Router();

router.post("/checkout", authenticate, validateCheckout, BillingController.checkout);
router.post("/portal", authenticate, BillingController.portal);
// Pulls the user's subscriptions from the provider, for when a webhook is late.
router.post("/sync", authenticate, BillingController.sync);
// No authenticate — the payment provider calls this; the signature is the auth.
router.post("/webhook", BillingController.webhook);

export default router;
