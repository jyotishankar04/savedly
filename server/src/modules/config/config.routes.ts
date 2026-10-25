import { Router } from "express";
import type { Request, Response } from "express";
import { env } from "../../config/env";
import { ApiResponse } from "../../shared/response/api-response";
import { isBillingEnabled } from "../billing";
import { isCalendarProviderEnabled, isCalendarSyncEnabled } from "../feature-flags/api";
import { isAiReady } from "../admin/api";
import { isGithubStarsAvailable } from "../integrations/api";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  // New Google Calendar connections can be switched off (Admin > Features), as hosted did during
  // Google's review; the client then shows "coming soon" instead of a Connect button that hits
  // Google's unverified-app warning.
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
      // False on a self-hosted install without AI, so the app can say why summaries and Ask don't work.
      aiReady,
      // GitHub stars can be connected: sign-in is set up and an admin hasn't switched it off.
      githubStars,
    }),
  );
});

export default router;
