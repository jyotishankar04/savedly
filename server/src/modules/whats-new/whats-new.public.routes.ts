import { Router } from "express";
import { WhatsNewController } from "./whats-new.controller";

// Mounted at /whats-new. Public: the landing page reads it for every visitor.
const router = Router();

router.get("/active", WhatsNewController.active);

export default router;
