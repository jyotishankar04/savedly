import { logger } from "../../shared/utils/logger";
import { env } from "../../config/env";
import { EmailCategory, EmailTemplateKey, NotificationType } from "../../db/enums";
import { createNotification } from "../notification/notification.service";
import { sendEmail } from "../email";
import { eventDetectedEmailTemplate } from "../../shared/mailer/templates";
import { userTimeZone } from "../../shared/utils/time-zone";

/**
 * The seam between AI event detection (ingestion/nodes/detect-event.ts,
 * via upsert-vectors.ts) and the notification/email subsystems. Same
 * fire-and-forget shape as share/share.notify.ts: ingestion has already
 * committed the memory row by the time this runs, so a notification/email
 * failure here must never surface as an ingestion failure.
 */

/** Fire-and-forget wrapper so no caller ever has to remember to catch. */
function emit(what: string, run: () => Promise<unknown>): void {
  void run().catch((err) => logger.warn({ err }, `Failed to deliver notification: ${what}`));
}

// Below this, DetectEvent's guess is stored on the row (for a possible
// future low-confidence affordance) but stays silent — no notification, no
// email, no popup. Picked with margin above "more likely than not" (0.5) to
// absorb LLM calibration noise, without being so high that clearly-stated
// events get dropped over phrasing.
export const EVENT_DETECTION_CONFIDENCE_THRESHOLD = 0.6;

export interface EventDetectedNotice {
  userId: string;
  email: string;
  memoryId: string;
  memoryTitle: string;
  suggestedEventAt: string;
}

/**
 * A date and time as the user would read it: in their own time zone, not
 * the server's (which is UTC in production, so "4:30 pm" read as "11:00 am").
 */
export function eventWhenText(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function notifyEventDetected(notice: EventDetectedNotice): void {
  emit("event detected", async () => {
    const when = eventWhenText(notice.suggestedEventAt, await userTimeZone(notice.userId));
    return createNotification({
      userId: notice.userId,
      type: NotificationType.EVENT_DETECTED,
      title: `Looks like "${notice.memoryTitle}" is about an event`,
      body: `Detected date: ${when}. Add it to your calendar?`,
      actionUrl: `/app/memories/${notice.memoryId}`,
      metadata: { memoryId: notice.memoryId, suggestedEventAt: notice.suggestedEventAt },
    });
  });

  emit("event detected email", async () => {
    const { subject, html } = eventDetectedEmailTemplate({
      title: notice.memoryTitle,
      eventAt: notice.suggestedEventAt,
      timeZone: await userTimeZone(notice.userId),
      url: `${env.FRONTEND_URL}/app/memories/${notice.memoryId}`,
    });
    return sendEmail({
      to: notice.email,
      recipientUserId: notice.userId,
      category: EmailCategory.TRANSACTIONAL,
      templateKey: EmailTemplateKey.EVENT_DETECTED,
      subject,
      html,
    });
  });
}

export interface DuplicateDetectedNotice {
  userId: string;
  /** The copy that was just saved. */
  memoryId: string;
  memoryTitle: string;
  /** The one already in the library. */
  existingId: string;
  existingTitle: string;
}

/** In the app only: a duplicate is worth a nudge the next time they look, not an email. */
export function notifyDuplicateDetected(notice: DuplicateDetectedNotice): void {
  emit("duplicate detected", () =>
    createNotification({
      userId: notice.userId,
      type: NotificationType.DUPLICATE_DETECTED,
      title: `"${notice.memoryTitle}" is already in your library`,
      body: "You saved it again just now. Keep both, or skip the new copy?",
      actionUrl: `/app/memories/${notice.existingId}`,
      metadata: { memoryId: notice.memoryId, duplicateOfId: notice.existingId, existingTitle: notice.existingTitle },
    }),
  );
}
