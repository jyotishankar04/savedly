import { Router } from "express";
import calendarRoutes from "./calendar/calendar.routes";
import githubRoutes from "./github/github.routes";

// Aggregates the third-party integrations at /api/v1/integrations; add one with a new sub-directory
// and one `router.use(...)` line.
const router = Router();

router.use("/calendar", calendarRoutes);
router.use("/github", githubRoutes);

export default router;
