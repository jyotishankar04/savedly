import { Router } from "express";
import { ReportController } from "./report.controller";
import { validateCreateReport } from "./report.validator";
import { optionalAuthenticate } from "../../shared/middlewares/optional-authenticate";
import { reportRateLimiter } from "../../shared/middlewares/rate-limit";

const router = Router();

// Public: reports come from the unauthenticated marketing page as often as signed in.
// optionalAuthenticate sets req.user when a session exists, without requiring one.
router.post("/", optionalAuthenticate, reportRateLimiter, validateCreateReport, ReportController.create);

export default router;
