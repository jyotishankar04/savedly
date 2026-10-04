import { Router } from "express";
import { ReportController } from "./report.controller";
import { validateCreateReport } from "./report.validator";
import { optionalAuthenticate } from "../../shared/middlewares/optional-authenticate";
import { reportRateLimiter } from "../../shared/middlewares/rate-limit";

const router = Router();

// Public — bug reports and feature requests come from an unauthenticated
// marketing page as often as a signed-in one. optionalAuthenticate attaches
// req.user when a valid session happens to be present, without requiring one.
router.post("/", reportRateLimiter, optionalAuthenticate, validateCreateReport, ReportController.create);

export default router;
