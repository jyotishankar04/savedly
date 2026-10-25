import { Queue, Worker } from "bullmq";
import { and, asc, count, eq, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { redis } from "../../config/redis";
import { env } from "../../config/env";
import { db } from "../../db";
import { memories, userSettings, users } from "../../db/schema";
import { EmailCategory, EmailTemplateKey, UserStatus } from "../../db/enums";
import { weeklyDigestEmailTemplate } from "../../platform/mailer/templates";
import { logger } from "../../shared/utils/logger";
import { sendEmail } from "../email/api";

// The weekly email: Sunday morning in each person's time zone, a few unread Inbox saves. On unless
// turned off in Settings > Notifications (notifyWeeklySummary); nothing is sent when nothing is
// unread.

const QUEUE_NAME = "weekly-digest";
const JOB_NAME = "sweep";
// Every 15 minutes, so the 9 o'clock hour is caught in every time zone, half- and quarter-hour ones included.
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;
const SEND_WEEKDAY = "Sun";
const SEND_HOUR = 9;
const MAX_ITEMS = 5;
// Saves older than this have probably been forgotten on purpose.
const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;
// Less than a week, so a clock change or a late sweep never skips a Sunday.
const MIN_GAP_MS = 6 * 24 * 60 * 60 * 1000;

const digestQueue = new Queue(QUEUE_NAME, { connection: redis });

/** The weekday ("Sun") and hour (0-23) it is now in `timeZone`; an unknown zone counts as UTC. */
function localClock(now: Date, timeZone: string | null): { weekday: string; hour: number } {
  const read = (zone: string) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
    return { weekday: parts.find((p) => p.type === "weekday")?.value ?? "", hour: Number(parts.find((p) => p.type === "hour")?.value ?? -1) };
  };
  try {
    return read(timeZone || "UTC");
  } catch {
    return read("UTC");
  }
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** The oldest unread Inbox saves, how many are unread, how many were saved this week. */
export async function buildWeeklyDigest(userId: string, now = new Date()) {
  const inbox = and(
    eq(memories.userId, userId),
    isNull(memories.readAt),
    eq(memories.inTrash, false),
    eq(memories.isArchived, false),
    eq(memories.isVaulted, false),
    or(isNull(memories.remindAt), lte(memories.remindAt, now)),
  );
  const [items, [unread], [week]] = await Promise.all([
    db
      .select({ id: memories.id, title: memories.title, description: memories.description, url: memories.url, createdAt: memories.createdAt })
      .from(memories)
      .where(and(inbox, gte(memories.createdAt, new Date(now.getTime() - LOOKBACK_MS))))
      .orderBy(asc(memories.createdAt))
      .limit(MAX_ITEMS),
    db.select({ n: count() }).from(memories).where(inbox),
    db
      .select({ n: count() })
      .from(memories)
      .where(and(eq(memories.userId, userId), eq(memories.inTrash, false), gte(memories.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)))),
  ]);
  return {
    items: items.map((m) => ({
      title: m.title,
      summary: m.description,
      source: hostOf(m.url),
      url: `${env.FRONTEND_URL}/app/memories/${m.id}`,
      createdAt: m.createdAt.toISOString(),
    })),
    unreadCount: unread?.n ?? 0,
    savedThisWeek: week?.n ?? 0,
  };
}

/** Builds and sends one person's email now. False when there was nothing unread to send. */
export async function sendWeeklyDigestTo(person: { id: string; email: string; name: string | null }, now = new Date()): Promise<boolean> {
  const digest = await buildWeeklyDigest(person.id, now);
  if (digest.items.length === 0) return false;
  const { subject, html } = weeklyDigestEmailTemplate({
    name: person.name,
    ...digest,
    inboxUrl: `${env.FRONTEND_URL}/app/inbox`,
    settingsUrl: `${env.FRONTEND_URL}/app/settings/notifications`,
    now,
  });
  await sendEmail({ to: person.email, recipientUserId: person.id, category: EmailCategory.TRANSACTIONAL, templateKey: EmailTemplateKey.WEEKLY_DIGEST, subject, html });
  return true;
}

/**
 * Sends to everyone it's Sunday 9:00 for who hasn't had it this week. Each is claimed first by one
 * upsert on weekly_digest_sent_at, so two servers never both send.
 */
export async function sendWeeklyDigests(now = new Date(), only?: string[]): Promise<number> {
  const people = await db
    .select({ id: users.id, email: users.email, name: users.name, on: userSettings.notifyWeeklySummary, timezone: userSettings.timezone, sentAt: userSettings.weeklyDigestSentAt })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    // `only` narrows the sweep to some people (a test); the sweep itself passes none.
    .where(and(isNull(users.deletedAt), eq(users.status, UserStatus.ACTIVE), only ? inArray(users.id, only) : undefined));

  const cutoff = new Date(now.getTime() - MIN_GAP_MS);
  let sent = 0;
  for (const person of people) {
    // No settings row yet means the default, which is on.
    if (person.on === false || !person.email) continue;
    if (person.sentAt && person.sentAt > cutoff) continue;
    const clock = localClock(now, person.timezone);
    if (clock.weekday !== SEND_WEEKDAY || clock.hour !== SEND_HOUR) continue;

    const [claimed] = await db
      .insert(userSettings)
      .values({ userId: person.id, weeklyDigestSentAt: now })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { weeklyDigestSentAt: now },
        setWhere: or(isNull(userSettings.weeklyDigestSentAt), lt(userSettings.weeklyDigestSentAt, cutoff)),
      })
      .returning({ userId: userSettings.userId });
    if (!claimed) continue;

    try {
      if (await sendWeeklyDigestTo(person, now)) sent++;
    } catch (err) {
      logger.error({ err, userId: person.id }, "[weekly-digest] couldn't send");
    }
  }
  if (sent) logger.info({ sent }, "[weekly-digest] sent weekly emails");
  return sent;
}

export async function startWeeklyDigestWorker(): Promise<Worker> {
  sendWeeklyDigests().catch((err) => logger.error({ err }, "[weekly-digest] initial sweep failed"));
  await digestQueue.upsertJobScheduler(JOB_NAME, { every: SWEEP_INTERVAL_MS }, { name: JOB_NAME });
  const worker = new Worker(QUEUE_NAME, () => sendWeeklyDigests(), { connection: redis });
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "[weekly-digest] sweep failed"));
  return worker;
}
