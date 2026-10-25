import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { redis } from "../../config/redis";
import { db } from "../../db";
import { emailMessages } from "../../db/schema";
import { EmailStatus } from "../../db/enums";
import { logger } from "../../shared/utils/logger";
import { isEmailEnabled, sendMail } from "../../platform/mailer/mailer";
import { unsubscribeHeaders } from "../../platform/mailer/unsubscribe";
import type { EmailJobData } from "./email.queue";

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    "email",
    async (job) => {
      const [row] = await db.select().from(emailMessages).where(eq(emailMessages.id, job.data.emailMessageId));
      if (!row) return; // deleted/invalid — nothing to do

      // Idempotency guard: a retry after an attempt that actually succeeded (lost SMTP ack) mustn't
      // send twice.
      if (row.status === EmailStatus.SENT) return;

      // Self-hosted without SMTP: record why and stop instead of burning retries.
      if (!(await isEmailEnabled())) {
        await db
          .update(emailMessages)
          .set({ status: EmailStatus.FAILED, error: "Email isn't configured on this server" })
          .where(eq(emailMessages.id, row.id));
        return;
      }

      await db.update(emailMessages).set({ status: EmailStatus.SENDING, attempts: row.attempts + 1 }).where(eq(emailMessages.id, row.id));

      await sendMail({
        to: row.recipientEmail,
        subject: row.subject,
        html: row.bodyHtml,
        // A campaign is bulk mail, so the inbox gets its own unsubscribe button.
        headers: row.campaignId && row.recipientUserId ? unsubscribeHeaders(row.recipientUserId) : undefined,
      });

      await db.update(emailMessages).set({ status: EmailStatus.SENT, sentAt: new Date() }).where(eq(emailMessages.id, row.id));
    },
    { connection: redis },
  );

  worker.on("failed", (job, err) => {
    logger.error({ emailMessageId: job?.data.emailMessageId, err }, "[email] send failed");

    // Only mark FAILED once BullMQ's retries are exhausted; an in-flight retry shouldn't read as a
    // permanent failure.
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? 1;
    if (job?.data.emailMessageId && attemptsMade >= maxAttempts) {
      db.update(emailMessages)
        .set({ status: EmailStatus.FAILED, error: err.message })
        .where(eq(emailMessages.id, job.data.emailMessageId))
        .catch((updateErr) => {
          logger.error({ emailMessageId: job.data.emailMessageId, err: updateErr }, "[email] failed to mark message failed");
        });
    }
  });

  return worker;
}
