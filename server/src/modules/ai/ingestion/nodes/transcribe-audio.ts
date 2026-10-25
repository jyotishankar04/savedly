import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";

// TODO: wire a speech-to-text provider; voice memories ingest empty for now, so later steps use the title.
export async function transcribeAudio(state: IngestionStateType): Promise<IngestionUpdate> {
  logNode(state.memoryId, "transcribeAudio", { skipped: "STT provider not yet chosen" });
  return { rawContent: "" };
}
