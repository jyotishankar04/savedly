import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { memories } from "../../../../db/schema";
import { DuplicateStatus, findDuplicate, notifyDuplicateDetected } from "../../../memory/api";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";

/**
 * Is this already in the library? Runs for unattended saves (extension shortcut, phone share, API)
 * and notifies to keep both. App saves are asked first; re-runs skip. No model call; exact matches
 * only.
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
