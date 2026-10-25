import { Router } from "express";
import { ContactController } from "./contact.controller";
import { validateSendContact } from "./contact.validator";
import { contactRateLimiter } from "../../shared/middlewares/rate-limit";
import { optionalAuthenticate } from "../../shared/middlewares/optional-authenticate";

const router = Router();

// Public: signed in or not (a signed-in sender's message is linked to their account).
router.post("/", optionalAuthenticate, contactRateLimiter, validateSendContact, ContactController.send);

export default router;
