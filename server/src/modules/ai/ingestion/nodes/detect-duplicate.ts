import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { memories } from "../../../../db/schema";
import { DuplicateStatus, findDuplicate } from "../../../memory/duplicates";
import { notifyDuplicateDetected } from "../../../memory/memory.notify";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";

/**
 * Is this save already in the library? Runs for everything that reaches the
 * pipeline unchecked, which is anything saved without someone looking at the
 * app (the extension's shortcut, a share from a phone, the API). When it
 * finds one, it leaves a notification asking whether to keep both.
 *
 * Saves made in the app are asked before they're saved (memory.service.ts)
 * and arrive here already decided, so they are skipped. So are re-runs: a
 * memory is only ever checked once.
 *
 * No model call, and exact matches only: see memory/duplicates.ts.
 */
export async function detectDuplicate(state: IngestionStateType): Promise<IngestionUpdate> {
  const [memory] = await db
    .select({ title: memories.title, type: memories.type, normalizedUrl: memories.normalizedUrl, content: memories.content, duplicateStatus: memories.duplicateStatus })
    .from(memories)
    .where(eq(memories.id, state.memoryId))
    .limit(1);
  if (!memory || memory.duplicateStatus !== null) return {};

  const existing = await findDuplicate(state.userId, memory, state.memoryId);
  await db
    .update(memories)
    .set({ duplicateStatus: existing ? DuplicateStatus.PENDING : DuplicateStatus.NONE, duplicateOfId: existing?.id ?? null })
    .where(eq(memories.id, state.memoryId));
  logNode(state.memoryId, "detectDuplicate", { duplicateOf: existing?.id ?? null });

  if (existing) {
    notifyDuplicateDetected({ userId: state.userId, memoryId: state.memoryId, memoryTitle: memory.title, existingId: existing.id, existingTitle: existing.title });
  }
  return {};
}
