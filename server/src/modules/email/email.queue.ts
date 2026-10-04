import { Queue } from "bullmq";
import { redis } from "../../config/redis";

export interface EmailJobData {
  emailMessageId: string;
}

export const emailQueue = new Queue<EmailJobData>("email", { connection: redis });

/** Fire-and-forget from email.service.ts — the DB row is already the durable record by the time this is called, so a queue hiccup here just delays delivery, never loses the request. */
export async function enqueueEmail(emailMessageId: string): Promise<void> {
  await emailQueue.add(
    "send",
    { emailMessageId },
    {
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 24 * 60 * 60 },
      removeOnFail: false,
    },
  );
}
