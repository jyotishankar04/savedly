import { logger } from "../../shared/utils/logger";
import { env } from "../../config/env";
import { EmailCategory, EmailTemplateKey, NotificationType } from "../../db/enums";
import { createNotification } from "../notification/notification.service";
import { sendEmail } from "../email";
import { eventDetectedEmailTemplate } from "../../shared/mailer/templates";

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

export function notifyEventDetected(notice: EventDetectedNotice): void {
  emit("event detected", () =>
    createNotification({
      userId: notice.userId,
      type: NotificationType.EVENT_DETECTED,
      title: `Looks like "${notice.memoryTitle}" is about an event`,
      body: `Detected date: ${new Date(notice.suggestedEventAt).toLocaleString()}. Add it to your calendar?`,
      actionUrl: `/app/memories/${notice.memoryId}`,
      metadata: { memoryId: notice.memoryId, suggestedEventAt: notice.suggestedEventAt },
    })
  );

  emit("event detected email", () => {
    const { subject, html } = eventDetectedEmailTemplate({
      title: notice.memoryTitle,
      eventAt: notice.suggestedEventAt,
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
