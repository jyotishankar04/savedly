import { Router } from "express";
import type { Request, Response } from "express";
import { env } from "../../config/env";
import { ApiResponse } from "../../shared/response/api-response";
import { isBillingEnabled } from "../billing";
import { isCalendarProviderEnabled, isCalendarSyncEnabled } from "../feature-flags/feature-flags.service";

// Mounted at /config by ../../routes/index.ts. Public, unauthenticated: lets
// the client decide at runtime (not build time) whether it's talking to a
// self-hosted install, so one client image works for both.
const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  // New Google Calendar connections can be switched off (Admin > Features),
  // which the hosted service does while Google reviews its access to
  // calendars. The client then shows it as coming soon instead of a
  // Connect button that would lead to Google's "unverified app" warning.
  const [calendarSync, googleCalendar] = await Promise.all([isCalendarSyncEnabled(), isCalendarProviderEnabled("google")]);
  res.status(200).json(
    ApiResponse.success({ selfHosted: env.SELF_HOSTED, billing: isBillingEnabled(), googleCalendar: calendarSync && googleCalendar }),
  );
});

export default router;
