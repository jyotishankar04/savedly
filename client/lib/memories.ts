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
  /** The Inbox: unread and not snoozed. */
  inbox?: boolean;
  /** Waiting on a reminder. */
  snoozed?: boolean;
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
  /** "ask": if it's already in the library, don't save; the server answers 409 so the app can ask. "allow": save it anyway. */
  onDuplicate?: "ask" | "allow";
  /** A note still being written (the full-page editor): processed once writing stops, not on this first save. */
  editing?: boolean;
}

/** The memory a save would duplicate, from the server's DUPLICATE_MEMORY error. */
export interface DuplicateOf {
  id: string;
  title: string;
  type: string;
  createdAt: string;
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
  /** The Inbox: true marks it read, false unread again. */
  isRead?: boolean;
  /** "Remind me": ISO datetime, or null to cancel the reminder. */
  remindAt?: string | null;
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

export type NoteRewriteMode = "fix" | "improve" | "shorten";

/** A note rewritten by the AI, to show before anything changes; nothing is saved. `markdown` is the note as it is in the editor now. */
export async function rewriteNote(id: string, mode: NoteRewriteMode, markdown: string, part = false, context?: { before: string; after: string }): Promise<{ markdown: string }> {
  return apiFetch<{ markdown: string }>(`/memories/${id}/rewrite`, { method: "POST", body: { mode, markdown, part: part || undefined, context } });
}

/** Three AI titles for a note, from its title and text as they are in the editor; nothing is saved. */
export async function suggestNoteTitles(id: string, title: string, markdown: string): Promise<{ titles: string[] }> {
  return apiFetch<{ titles: string[] }>(`/memories/${id}/title-suggestions`, { method: "POST", body: { title, markdown } });
}

/** Runs Savedly's processing on a memory again: summary, tags, collection and dates. */
export async function reprocessMemory(id: string, options: { retitle?: boolean } = {}): Promise<MemoryDetail> {
  return apiFetch<MemoryDetail>(`/memories/${id}/refresh-preview`, { method: "POST", body: options.retitle ? { retitle: true } : undefined });
}

export interface InboxCount {
  unread: number;
  snoozed: number;
}

export async function getInboxCount(): Promise<InboxCount> {
  return apiFetch<InboxCount>("/memories/inbox/count");
}

/** Marks everything now in the Inbox as read (snoozed ones stay snoozed). */
export async function markInboxRead(): Promise<{ marked: number }> {
  return apiFetch<{ marked: number }>("/memories/inbox/read-all", { method: "POST" });
}

export type MemoryHighlight = NonNullable<MemoryDetail["highlights"]>[number];

export async function deleteHighlight(id: string): Promise<void> {
  await apiFetch<void>(`/highlights/${id}`, { method: "DELETE" });
}

export async function deleteMemory(id: string): Promise<void> {
  await apiFetch<void>(`/memories/${id}`, { method: "DELETE" });
}

/** The answer to a "duplicate detected" notification: "skip" moves the new copy to Trash, "keep" leaves both. */
export async function resolveDuplicate(id: string, action: "skip" | "keep"): Promise<void> {
  await apiFetch(`/memories/${id}/duplicate`, { method: "POST", body: { action } });
}
