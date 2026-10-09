import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { redis } from "../../../config/redis";
import { db } from "../../../db";
import { memories, attachments } from "../../../db/schema";
import { MemoryStatus } from "../../../db/enums";
import { logger } from "../../../shared/utils/logger";
import { getLangfuseHandler } from "../langfuse";
import type { BrowserCapturePayload } from "../url-processor";
import { bumpUserCache } from "../../../shared/cache/response-cache";
import { ingestionGraph } from "./graph";
import { INGESTION_QUEUE, ingestionQueue, ingestionWorkerOptions, type IngestionJobData } from "./queue";

/** Runs in the same process as the API for now (fine for dev — see the AI ingestion plan for the production split). */
export function startIngestionWorker(): Worker<IngestionJobData> {
  // Jobs finished before the queue removed them by itself are still in Redis:
  // clear those that are more than an hour old. Harmless when there are none.
  void ingestionQueue
    .clean(60 * 60 * 1000, 5000, "completed")
    .catch((err) => logger.warn({ err }, "[ingestion] couldn't clear old finished jobs"));

  const worker = new Worker<IngestionJobData>(
    INGESTION_QUEUE,
    async (job) => {
      logger.info({ memoryId: job.data.memoryId }, "[ingestion] job started");

      const [memory] = await db.select().from(memories).where(eq(memories.id, job.data.memoryId));
      if (!memory) {
        logger.warn({ memoryId: job.data.memoryId }, "Ingestion job skipped — memory no longer exists");
        return;
      }

      const [attachment] = await db
        .select({ fileUrl: attachments.fileUrl, mimeType: attachments.mimeType })
        .from(attachments)
        .where(eq(attachments.memoryId, memory.id))
        .limit(1);

      const langfuseHandler = getLangfuseHandler(memory.id);

      await ingestionGraph.invoke(
        {
          memoryId: memory.id,
          userId: memory.userId,
          mediaType: memory.type,
          url: memory.url,
          attachmentUrl: attachment?.fileUrl ?? null,
          attachmentMimeType: attachment?.mimeType ?? null,
          existingTitle: memory.title,
          rawContent: memory.content ?? "",
          caption: memory.content ?? "",
          browserCapture: (memory.browserCapture as BrowserCapturePayload | null) ?? null,
        },
        langfuseHandler ? { callbacks: [langfuseHandler] } : undefined,
      );

      // The memory now has its summary, tags and collection: drop the owner's
      // cached reads so the client's next fetch shows them.
      await bumpUserCache(memory.userId);

      // Langfuse batches events client-side — flush before the job (and
      // potentially the process, since this runs in-process with the API
      // for now) moves on, or the trace may never actually get sent.
      await langfuseHandler?.flushAsync();

      logger.info({ memoryId: job.data.memoryId }, "[ingestion] job completed");
    },
    { connection: redis, ...ingestionWorkerOptions() },
  );

  worker.on("failed", (job, err) => {
    logger.error({ memoryId: job?.data.memoryId, err }, "[ingestion] job failed");

    // Every prior node degrades gracefully instead of throwing — reaching
    // here means something genuinely broke (a bug, an outage). The memory
    // itself was already created and must never be left stuck at
    // "processing" forever, per the save guarantee.
    if (job?.data.memoryId) {
      db.update(memories)
        .set({ status: MemoryStatus.FAILED })
        .where(eq(memories.id, job.data.memoryId))
        .returning({ userId: memories.userId })
        .then(([row]) => (row ? bumpUserCache(row.userId) : undefined))
        .catch((updateErr) => {
          logger.error({ memoryId: job.data.memoryId, err: updateErr }, "[ingestion] failed to mark memory as failed");
        });
    }
  });

  return worker;
}
