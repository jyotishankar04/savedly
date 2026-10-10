import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { requireAdmin } from "../../shared/middlewares/require-admin";
import { AiUsageController } from "./ai-usage.controller";
import { validateUsageByUser, validateUsageRange } from "./ai-usage.validator";
import { ApiResponse } from "../../shared/response/api-response";
import { getAiHealth } from "../ai/provider-health";

const router = Router();

// Whether the instance's own AI account is answering (ai/provider-health.ts).
router.get("/health", authenticate, requireAdmin, async (_req, res) => {
  res.status(200).json(ApiResponse.success(await getAiHealth()));
});
router.get("/summary", authenticate, requireAdmin, validateUsageRange, AiUsageController.summary);
router.get("/by-user", authenticate, requireAdmin, validateUsageByUser, AiUsageController.byUser);
router.get("/users/:id", authenticate, requireAdmin, validateUsageRange, AiUsageController.forUser);

export default router;
