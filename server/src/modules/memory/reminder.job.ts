import { Queue, Worker } from "bullmq";
import { and, eq, inArray, lte } from "drizzle-orm";
import { redis } from "../../config/redis";
import { db } from "../../db";
import { memories, userSettings, users } from "../../db/schema";
import { logger } from "../../shared/utils/logger";
import { notifyMemoryReminder } from "./memory.notify";

const QUEUE_NAME = "memory-reminders";
const JOB_NAME = "sweep";
// A reminder set for 3:00 arrives by 3:01.
const SWEEP_INTERVAL_MS = 60 * 1000;

const reminderQueue = new Queue(QUEUE_NAME, { connection: redis });

/**
 * Brings back every memory whose reminder is due: unread again (so it's at
 * the top of the Inbox), remindedAt now, remindAt cleared, then a
 * notification and, unless turned off, an email. Claimed with one UPDATE …
 * RETURNING, so two servers sweeping at once never send a reminder twice.
 * A trashed memory's reminder waits until it's restored.
 */
export async function sendDueReminders(): Promise<number> {
  const now = new Date();
  const due = await db
    .update(memories)
    .set({ readAt: null, remindedAt: now, remindAt: null })
    .where(and(lte(memories.remindAt, now), eq(memories.inTrash, false)))
    .returning({ id: memories.id, userId: memories.userId, title: memories.title, description: memories.description, url: memories.url });
  if (due.length === 0) return 0;

  const userIds = [...new Set(due.map((m) => m.userId))];
  const people = await db
    .select({ id: users.id, email: users.email, deletedAt: users.deletedAt, emails: userSettings.notifyReminderEmails })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(inArray(users.id, userIds));
  const byId = new Map(people.map((p) => [p.id, p]));

  for (const memory of due) {
    const person = byId.get(memory.userId);
    if (!person || person.deletedAt) continue;
    notifyMemoryReminder({
      userId: memory.userId,
      // No settings row yet means the default, which is on.
      email: person.emails === false ? null : person.email,
      memoryId: memory.id,
      title: memory.title,
      summary: memory.description,
      url: memory.url,
    });
  }
  logger.info({ count: due.length }, "[reminders] sent due reminders");
  return due.length;
}

/** Mirrors startTrashPurgeWorker: one sweep now, then every minute. Call once from server.ts. */
export async function startReminderWorker(): Promise<Worker> {
  sendDueReminders().catch((err) => logger.error({ err }, "[reminders] initial sweep failed"));
  await reminderQueue.upsertJobScheduler(JOB_NAME, { every: SWEEP_INTERVAL_MS }, { name: JOB_NAME });
  const worker = new Worker(QUEUE_NAME, () => sendDueReminders(), { connection: redis });
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "[reminders] sweep failed"));
  return worker;
}
