import { Router } from "express";
import type { Request, Response } from "express";
import { env } from "../../config/env";
import { ApiResponse } from "../../shared/response/api-response";
import { isBillingEnabled } from "../billing";
import { isCalendarProviderEnabled, isCalendarSyncEnabled } from "../feature-flags/feature-flags.service";
import { isAiReady } from "../admin/system/setup.service";
import { isGithubStarsAvailable } from "../integrations/github/github.controller";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  // New Google Calendar connections can be switched off (Admin > Features),
  // which the hosted service does while Google reviews its access to
  // calendars. The client then shows it as coming soon instead of a
  // Connect button that would lead to Google's "unverified app" warning.
  const [calendarSync, googleCalendar, aiReady, githubStars] = await Promise.all([
    isCalendarSyncEnabled(),
    isCalendarProviderEnabled("google"),
    isAiReady(),
    isGithubStarsAvailable(),
  ]);
  res.status(200).json(
    ApiResponse.success({
      selfHosted: env.SELF_HOSTED,
      billing: isBillingEnabled(),
      googleCalendar: calendarSync && googleCalendar,
      // False on a self-hosted install whose admin hasn't connected AI yet, so
      // the app can say why summaries and Ask aren't working.
      aiReady,
      // GitHub stars can be connected: GitHub sign-in is set up and an admin hasn't switched the integration off.
      githubStars,
    }),
  );
});

export default router;
