import { logger } from "../../shared/utils/logger";
import { env } from "../../config/env";
import { EmailCategory, EmailTemplateKey, NotificationType } from "../../db/enums";
import { createNotification } from "../notification/api";
import { sendEmail } from "../email";
import { eventDetectedEmailTemplate, memoryReminderEmailTemplate } from "../../platform/mailer/templates";
import { userTimeZone } from "../../shared/utils/time-zone";

/**
 * The seam between AI event detection and notifications/email. Fire-and-forget like
 * share/share.notify.ts: the memory is committed, so a failure must never fail ingestion.
 */

/** Fire-and-forget wrapper so no caller ever has to remember to catch. */
function emit(what: string, run: () => Promise<unknown>): void {
  void run().catch((err) => logger.warn({ err }, `Failed to deliver notification: ${what}`));
}

// Below this, DetectEvent's guess is stored but silent. Set above 0.5 to absorb LLM calibration
// noise without dropping clearly stated events.
export const EVENT_DETECTION_CONFIDENCE_THRESHOLD = 0.6;

export interface EventDetectedNotice {
  userId: string;
  email: string;
  memoryId: string;
  memoryTitle: string;
  suggestedEventAt: string;
}

/** A date and time as the user reads it: in their time zone, not the server's (UTC in production). */
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
  memoryId: string;
  memoryTitle: string;
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

export interface MemoryReminderNotice {
  userId: string;
  /** Null when they turned reminder emails off, or have no address to send to. */
  email: string | null;
  memoryId: string;
  title: string;
  summary: string | null;
  url: string | null;
}

/** A reminder set with "Remind me" is due: in the app always, by email unless turned off. */
export function notifyMemoryReminder(notice: MemoryReminderNotice): void {
  emit("memory reminder", () =>
    createNotification({
      userId: notice.userId,
      type: NotificationType.MEMORY_REMINDER,
      title: `Reminder: ${notice.title}`,
      body: notice.summary ? (notice.summary.length > 160 ? `${notice.summary.slice(0, 160).trimEnd()}…` : notice.summary) : "You asked to come back to this.",
      actionUrl: `/app/memories/${notice.memoryId}`,
      metadata: { memoryId: notice.memoryId, url: notice.url },
    }),
  );
  if (!notice.email) return;
  const email = notice.email;
  emit("memory reminder email", () => {
    const { subject, html } = memoryReminderEmailTemplate({
      title: notice.title,
      summary: notice.summary,
      link: notice.url,
      url: `${env.FRONTEND_URL}/app/memories/${notice.memoryId}`,
      settingsUrl: `${env.FRONTEND_URL}/app/settings/notifications`,
    });
    return sendEmail({
      to: email,
      recipientUserId: notice.userId,
      category: EmailCategory.TRANSACTIONAL,
      templateKey: EmailTemplateKey.MEMORY_REMINDER,
      subject,
      html,
    });
  });
}
