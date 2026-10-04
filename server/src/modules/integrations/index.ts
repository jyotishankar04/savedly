import { Router } from "express";
import calendarRoutes from "./calendar/calendar.routes";

// Aggregates every third-party integration onto one router, mounted at
// /api/v1/integrations by ../../routes/index.ts. Each integration owns its
// own routes/controller/service/schema/validator files under its own
// sub-directory and is mounted at its own sub-path here — add a new
// integration (Notion, Slack, ...) by adding one more sub-directory and one
// more `router.use(...)` line, not by touching an existing one. Mirrors
// modules/admin/index.ts's aggregator shape.
const router = Router();

router.use("/calendar", calendarRoutes);

export default router;
