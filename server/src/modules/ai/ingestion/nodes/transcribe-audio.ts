import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";

// TODO: wire a real speech-to-text provider. Voice memories ingest with empty content for now, so
// later steps use the user's title.
export async function transcribeAudio(state: IngestionStateType): Promise<IngestionUpdate> {
  logNode(state.memoryId, "transcribeAudio", { skipped: "STT provider not yet chosen" });
  return { rawContent: "" };
}
