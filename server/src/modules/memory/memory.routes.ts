import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { MemoryController } from "./memory.controller";
import { HighlightController } from "../highlight/highlight.controller";
import { requireUnlockToUnvault, requireVaultUnlockedForQuery } from "../vault";
import { CalendarController, validatePushEvent, validateUpdateEvent } from "../integrations/calendar";
import { requireFeature } from "../plans/require-feature";
import {
  validateBrowserCapture,
  validateCreateMemory,
  validateListMemories,
  validateUpdateMemory, validateResolveDuplicate, validateSuggestForPage } from "./memory.validator";

const router = Router();

router.get("/", authenticate, validateListMemories, requireVaultUnlockedForQuery, MemoryController.list);
router.post("/", authenticate, validateCreateMemory, MemoryController.create);
// Must come before "/:id" — otherwise Express matches these as :id="export"/"graph".
router.get("/export", authenticate, MemoryController.exportAll);
router.get("/export/okf", authenticate, MemoryController.exportOkf);
router.get("/graph", authenticate, MemoryController.graph);
router.get("/inbox/count", authenticate, MemoryController.inboxCount);
router.post("/inbox/read-all", authenticate, MemoryController.inboxReadAll);
// The extension: is this page already saved?
router.get("/lookup", authenticate, MemoryController.lookup);
router.get("/url-keys", authenticate, MemoryController.urlKeys);
router.post("/suggest", authenticate, validateSuggestForPage, MemoryController.suggest);
router.get("/:id", authenticate, MemoryController.get);
router.get("/:id/highlights", authenticate, HighlightController.forMemory);
router.patch("/:id", authenticate, validateUpdateMemory, requireUnlockToUnvault, MemoryController.update);
router.delete("/:id", authenticate, MemoryController.remove);

router.post("/:id/browser-capture", authenticate, validateBrowserCapture, MemoryController.browserCapture);
router.post("/:id/refresh-preview", authenticate, MemoryController.refreshPreview);
router.post("/:id/duplicate", authenticate, validateResolveDuplicate, MemoryController.resolveDuplicate);
router.get("/:id/processing-status", authenticate, MemoryController.processingStatus);
router.post("/:id/calendar-events", authenticate, requireFeature("calendarSync"), validatePushEvent, CalendarController.pushEvent);
router.patch("/:id/calendar-event", authenticate, validateUpdateEvent, CalendarController.updateMemoryEvent);
router.delete("/:id/calendar-event", authenticate, CalendarController.deleteMemoryEvent);

export default router;
