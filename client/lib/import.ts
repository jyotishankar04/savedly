import { apiFetch, apiFetchRaw } from "@/lib/auth";

export type ImportSourceType = "bookmarks_html" | "url_list";
export type ImportItemStatus = "created" | "skipped_duplicate" | "failed";

export interface ImportResult {
  batchId: string;
  totalCount: number;
  createdCount: number;
  skippedCount: number;
}

export interface ImportBatch {
  id: string;
  sourceType: ImportSourceType;
  totalCount: number;
  createdCount: number;
  skippedCount: number;
  createdAt: string;
  stillProcessing: boolean;
}

export interface ImportItem {
  id: string;
  url: string;
  status: ImportItemStatus;
  memoryId: string | null;
  createdAt: string;
}

export async function runImport(sourceType: ImportSourceType, content: string): Promise<ImportResult> {
  return apiFetch<ImportResult>("/import", { method: "POST", body: { sourceType, content } });
}

export async function getImportBatch(batchId: string): Promise<ImportBatch> {
  return apiFetch<ImportBatch>(`/import/${batchId}`);
}

export async function getImportItems(batchId: string, params: { page?: number; limit?: number } = {}): Promise<{ items: ImportItem[]; page: number; limit: number; total: number }> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const { data, meta } = await apiFetchRaw<ImportItem[]>(`/import/${batchId}/items${qs ? `?${qs}` : ""}`);
  return { items: data, page: (meta.page as number) ?? 1, limit: (meta.limit as number) ?? 20, total: (meta.total as number) ?? data.length };
}
