import { Router } from "express";
import { ContactController } from "./contact.controller";
import { validateSendContact } from "./contact.validator";
import { contactRateLimiter } from "../../shared/middlewares/rate-limit";

const router = Router();

// Public: the website's contact page, signed in or not.
router.post("/", contactRateLimiter, validateSendContact, ContactController.send);

export default router;
