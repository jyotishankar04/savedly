import { apiFetch } from "@/lib/auth";

export type MemoryType = "web" | "video" | "note" | "image" | "document" | "voice";
export type MemoryStatus = "processing" | "ready" | "partial" | "failed";
export type SortBy = "relevance" | "recent" | "oldest" | "title" | "updated";

export interface AdvancedSearchInput {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  tagIds?: string[];
  tagMode?: "any" | "all";
  collectionIds?: string[];
  types?: MemoryType[];
  statuses?: MemoryStatus[];
  archived?: boolean;
  favorite?: boolean;
  vaulted?: boolean;
  inTrash?: boolean;
  sortBy?: SortBy;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  description: string | null;
  type: MemoryType;
  favorite: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
}

export const advancedSearch = (input: AdvancedSearchInput) => {
  const params = new URLSearchParams();
  if (input.query) params.append("query", input.query);
  if (input.dateFrom) params.append("dateFrom", input.dateFrom);
  if (input.dateTo) params.append("dateTo", input.dateTo);
  if (input.tagIds?.length) params.append("tagIds", JSON.stringify(input.tagIds));
  if (input.tagMode) params.append("tagMode", input.tagMode);
  if (input.types?.length) params.append("types", JSON.stringify(input.types));
  if (input.statuses?.length) params.append("statuses", JSON.stringify(input.statuses));
  if (input.archived !== undefined) params.append("archived", String(input.archived));
  if (input.favorite !== undefined) params.append("favorite", String(input.favorite));
  if (input.vaulted !== undefined) params.append("vaulted", String(input.vaulted));
  if (input.inTrash !== undefined) params.append("inTrash", String(input.inTrash));
  if (input.sortBy) params.append("sortBy", input.sortBy);
  if (input.sortOrder) params.append("sortOrder", input.sortOrder);
  params.append("limit", String(input.limit ?? 20));
  params.append("offset", String(input.offset ?? 0));

  return apiFetch<SearchResponse>(`/search/advanced?${params.toString()}`);
};
