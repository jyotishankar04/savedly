import { Router } from "express";
import calendarRoutes from "./calendar/calendar.routes";
import githubRoutes from "./github/github.routes";
import redditRoutes from "./reddit/reddit.routes";

// Aggregates the third-party integrations at /api/v1/integrations; add one with a new sub-directory
// and one `router.use(...)` line.
const router = Router();

router.use("/calendar", calendarRoutes);
router.use("/github", githubRoutes);
router.use("/reddit", redditRoutes);

export default router;
