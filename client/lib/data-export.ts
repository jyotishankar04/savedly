import { api } from "@/lib/auth";

/**
 * GET /memories/export doesn't return the usual {success,data,meta,error}
 * envelope — it's a raw file download — so this bypasses apiFetch/
 * apiFetchRaw entirely and talks to the configured axios instance directly,
 * the same "drop to raw axios" escape hatch lib/uploads.ts uses for its
 * presigned-URL PUT.
 */
export async function downloadMemoriesExport(): Promise<void> {
  const response = await api.get("/memories/export", { responseType: "blob" });

  const blob = new Blob([response.data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `savedly-export-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Same raw-download path as the JSON export, for the Open Knowledge Format bundle: a zip of Markdown files. */
export async function downloadOkfExport(): Promise<void> {
  const response = await api.get("/memories/export/okf", { responseType: "blob" });

  const blob = new Blob([response.data], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `savedly-okf-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
