import { Router } from "express";
import calendarRoutes from "./calendar/calendar.routes";
import githubRoutes from "./github/github.routes";

// Aggregates the third-party integrations, mounted at /api/v1/integrations. Each owns its files in
// its own sub-directory; add one with a new sub-directory and one `router.use(...)` line.
const router = Router();

router.use("/calendar", calendarRoutes);
router.use("/github", githubRoutes);

export default router;
