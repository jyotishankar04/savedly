import { readFileUrl } from "../../../../platform/storage";
import { extractPdfContent } from "./lib/parse-pdf";
import { logNode } from "../log";
import type { IngestionStateType, IngestionUpdate } from "../state";

/**
 * `document` memories are PDF-only today (upload.constants.ts). Parsing, including the large-PDF
 * path, is in lib/parse-pdf.ts, shared with parseWebContent.
 */
export async function extractDocText(state: IngestionStateType): Promise<IngestionUpdate> {
  if (!state.attachmentUrl) {
    logNode(state.memoryId, "extractDocText", { skipped: "no attachment" });
    return { rawContent: "" };
  }

  try {
    const bytes = await readFileUrl(state.attachmentUrl);
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const rawContent = await extractPdfContent(
      data,
      { userId: state.userId, requestType: "ingestion:pdf_summary", memoryId: state.memoryId },
      state.caption || undefined,
    );
    logNode(state.memoryId, "extractDocText", { attachmentUrl: state.attachmentUrl, contentLength: rawContent.length });
    return { rawContent };
  } catch (err) {
    // A corrupt/unreadable PDF shouldn't fail ingestion — downstream nodes
    // just work with an empty content string (title-only classification).
    logNode(state.memoryId, "extractDocText", { attachmentUrl: state.attachmentUrl, error: err instanceof Error ? err.message : String(err) });
    return { rawContent: "" };
  }
}
