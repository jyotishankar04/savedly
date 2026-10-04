import { apiFetch, apiFetchRaw } from "@/lib/auth";
import type { Memory, MemoryDetail, MemoryType } from "@/types/memory";
import type { UploadedFile } from "@/lib/uploads";

export type AttachmentInput = UploadedFile;

export interface ListMemoriesParams {
  type?: MemoryType;
  isFavorite?: boolean;
  isArchived?: boolean;
  inTrash?: boolean;
  isVaulted?: boolean;
  collectionId?: string;
  tag?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ListMemoriesResult {
  items: Memory[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateMemoryInput {
  type: MemoryType;
  url?: string;
  title?: string;
  content?: string;
  description?: string;
  faviconUrl?: string;
  previewImageUrl?: string;
  keywords?: string[];
  collectionIds?: string[];
  tags?: string[];
  attachments?: AttachmentInput[];
  captureMethod?: "server" | "extension" | "manual";
}

export interface CreateMemoryResult extends MemoryDetail {
  // Non-blocking duplicate hint (docs/URL_CAPTURE_AND_PREVIEW.md) — the
  // memory above was created either way; this just flags an existing match
  // by normalized URL so a caller can optionally surface it.
  duplicateOf: { id: string; title: string } | null;
}

export type UpdateMemoryInput = Partial<
  Pick<CreateMemoryInput, "title" | "content" | "collectionIds" | "tags" | "attachments"> & {
    description: string;
    isFavorite: boolean;
    isArchived: boolean;
    inTrash: boolean;
    isVaulted: boolean;
  }
> & {
  /** ISO datetime, or null to clear it. Omit to leave unchanged. */
  eventAt?: string | null;
};

function toQueryString(params: ListMemoriesParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listMemories(params: ListMemoriesParams = {}): Promise<ListMemoriesResult> {
  const { data, meta } = await apiFetchRaw<Memory[]>(`/memories${toQueryString(params)}`);
  return {
    items: data,
    page: (meta.page as number) ?? 1,
    limit: (meta.limit as number) ?? data.length,
    total: (meta.total as number) ?? data.length,
  };
}

export async function getMemory(id: string): Promise<MemoryDetail> {
  return apiFetch<MemoryDetail>(`/memories/${id}`);
}

export async function createMemory(input: CreateMemoryInput): Promise<CreateMemoryResult> {
  return apiFetch<CreateMemoryResult>("/memories", { method: "POST", body: input });
}

export async function updateMemory(id: string, patch: UpdateMemoryInput): Promise<MemoryDetail> {
  return apiFetch<MemoryDetail>(`/memories/${id}`, { method: "PATCH", body: patch });
}

export async function deleteMemory(id: string): Promise<void> {
  await apiFetch<void>(`/memories/${id}`, { method: "DELETE" });
}
