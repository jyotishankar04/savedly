import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireFeature } from "../../plans/require-feature";
import { CalendarController } from "./calendar.controller";
import {
  validateCreateEvent,
  validateDisconnectParams,
  validateExternalEventParams,
  validateListEventsQuery,
  validateUpdateExternalEvent,
} from "./calendar.validator";

// Mounted at /calendar by ../index.ts (itself mounted at /api/v1/integrations
// by ../../../routes/index.ts) — full path /api/v1/integrations/calendar/...
// Also see memory.routes.ts, which mounts
// POST /memories/:id/calendar-events -> CalendarController.pushEvent as an
// action on a memory rather than nesting it here.
const router = Router();

router.get("/connections", authenticate, CalendarController.listConnections);

// The in-app calendar view — merges connected providers' real events with
// any Memora memory that has an eventAt but isn't (yet) pushed anywhere.
router.get("/events", authenticate, validateListEventsQuery, CalendarController.listEvents);
router.post("/events", authenticate, requireFeature("calendarSync"), validateCreateEvent, CalendarController.createEvent);

// A purely external event — one that lives only on a connected calendar and
// was never created through Memora, so there's no memory to key off (see
// memory.routes.ts for the memory-backed edit/delete pair instead).
router.patch(
  "/events/:provider/:externalId",
  authenticate,
  validateExternalEventParams,
  validateUpdateExternalEvent,
  CalendarController.updateExternalEvent,
);
router.delete("/events/:provider/:externalId", authenticate, validateExternalEventParams, CalendarController.deleteExternalEvent);

// Connecting is a plan feature; an existing connection keeps showing events
// and can always be disconnected.
router.get("/google/connect", authenticate, requireFeature("calendarSync"), CalendarController.connectGoogle);
// No authenticate — the provider's redirect carries no session; the
// initiating user is instead recovered from the signed `state` param (see
// calendar.controller.ts's handleCallback / verifyCalendarStateToken).
router.get("/google/callback", CalendarController.googleCallback);

router.get("/microsoft/connect", authenticate, requireFeature("calendarMicrosoft"), CalendarController.connectMicrosoft);
router.get("/microsoft/callback", CalendarController.microsoftCallback);

router.delete("/:provider", authenticate, validateDisconnectParams, CalendarController.disconnect);

export default router;
