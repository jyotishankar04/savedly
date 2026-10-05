import { apiFetch, apiFetchRaw } from "@/lib/api";

export type MemoryType = "web" | "video" | "note" | "image" | "document" | "voice";
export type MemoryStatus = "processing" | "ready" | "partial" | "failed";
export type PreviewStatus = "available" | "partial" | "unavailable" | null;

export interface Attachment {
  id: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
}

export interface Memory {
  id: string;
  type: MemoryType;
  title: string | null;
  url: string | null;
  description: string | null;
  source: string | null;
  faviconUrl: string | null;
  previewImageUrl: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  inTrash: boolean;
  tags: string[];
  collections: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
  status: MemoryStatus;
  previewStatus: PreviewStatus;
  platform: string | null;
  canonicalUrl: string | null;
  captureMethod: string | null;
}

export interface MemoryDetail extends Memory {
  content: string | null;
  keywords: string[];
  attachments: Attachment[];
}

export interface ListMemoriesParams {
  type?: MemoryType;
  isFavorite?: boolean;
  isArchived?: boolean;
  inTrash?: boolean;
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

function buildQuery(params: ListMemoriesParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function listMemories(params: ListMemoriesParams = {}): Promise<ListMemoriesResult> {
  const { data, meta } = await apiFetchRaw<Memory[]>(`/memories${buildQuery(params)}`);
  return {
    items: data,
    page: (meta.page as number) ?? params.page ?? 1,
    limit: (meta.limit as number) ?? params.limit ?? data.length,
    total: (meta.total as number) ?? data.length,
  };
}

export async function getMemory(id: string): Promise<MemoryDetail> {
  return apiFetch<MemoryDetail>(`/memories/${id}`);
}

export interface CreateMemoryInput {
  type: MemoryType;
  url?: string;
  title?: string;
  content?: string;
  description?: string;
  collectionIds?: string[];
  tags?: string[];
  attachments?: { fileUrl: string; fileSize?: number; mimeType?: string }[];
  captureMethod?: "server" | "extension" | "manual" | "mobile";
}

export async function createMemory(input: CreateMemoryInput): Promise<MemoryDetail & { duplicateOf: { id: string; title: string } | null }> {
  return apiFetch(`/memories`, { method: "POST", body: input });
}

export interface UpdateMemoryPatch {
  title?: string;
  content?: string;
  description?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  inTrash?: boolean;
  collectionIds?: string[];
  tags?: string[];
  attachments?: { fileUrl: string; fileSize?: number; mimeType?: string }[];
}

export async function updateMemory(id: string, patch: UpdateMemoryPatch): Promise<MemoryDetail> {
  return apiFetch<MemoryDetail>(`/memories/${id}`, { method: "PATCH", body: patch });
}

export async function deleteMemory(id: string): Promise<void> {
  await apiFetch<void>(`/memories/${id}`, { method: "DELETE" });
}
