import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireFeature } from "../../plans/api";
import { CalendarController } from "./calendar.controller";
import {
  validateCreateEvent,
  validateDisconnectParams,
  validateExternalEventParams,
  validateListEventsQuery,
  validateUpdateExternalEvent,
} from "./calendar.validator";

// Mounted at /calendar under /api/v1/integrations. memory.routes.ts mounts POST
// /memories/:id/calendar-events (pushEvent) as a memory action instead.
const router = Router();

router.get("/connections", authenticate, CalendarController.listConnections);

// The in-app calendar: connected providers' events plus memories with an eventAt not yet pushed.
router.get("/events", authenticate, validateListEventsQuery, CalendarController.listEvents);
router.post("/events", authenticate, requireFeature("calendarSync"), validateCreateEvent, CalendarController.createEvent);

// A purely external event (only on a connected calendar, no memory); memory-backed edit/delete are
// in memory.routes.ts.
router.patch(
  "/events/:provider/:externalId",
  authenticate,
  validateExternalEventParams,
  validateUpdateExternalEvent,
  CalendarController.updateExternalEvent,
);
router.delete("/events/:provider/:externalId", authenticate, validateExternalEventParams, CalendarController.deleteExternalEvent);

// Connecting is a plan feature; an existing connection keeps showing events and can always be disconnected.
router.get("/google/connect", authenticate, requireFeature("calendarSync"), CalendarController.connectGoogle);
// No authenticate: the provider's redirect has no session, so the user is recovered from the signed
// `state` (verifyCalendarStateToken).
router.get("/google/callback", CalendarController.googleCallback);

router.delete("/:provider", authenticate, validateDisconnectParams, CalendarController.disconnect);

export default router;
