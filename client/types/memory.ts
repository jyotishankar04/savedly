export type MemoryType = "web" | "video" | "note" | "image" | "document" | "voice";

export interface Memory {
  id: string;
  type: MemoryType;
  title: string;
  url: string | null;
  description: string | null;
  source: string | null;
  faviconUrl: string | null;
  previewImageUrl: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  inTrash: boolean;
  /** When this was trashed. Null unless inTrash is true — see the server's 15-day purge job. */
  trashedAt: string | null;
  isVaulted: boolean;
  /** User-set date/time this memory relates to — null means no event attached. Powers "Add to calendar". */
  eventAt: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // AI ingestion output — null until the background pipeline finishes for this memory.
  resourceCategory: string | null;
  inferredIntent: string | null;
  contentType: string | null;
  extractedFields: Record<string, string> | null;
  // URL capture & preview system — status is always set ("processing" at
  // creation); the preview.* fields stay null for non-link memories or until
  // ingestion runs. See docs/URL_CAPTURE_AND_PREVIEW.md.
  status: "processing" | "ready" | "partial" | "failed";
  previewStatus: "available" | "partial" | "unavailable" | null;
  previewSource: "server" | "browser" | "user" | "platform_fallback" | "generic_fallback" | null;
  platform: string | null;
  resourceType: string | null;
  canonicalUrl: string | null;
  captureMethod: "server" | "extension" | "manual" | null;
  collections: { id: string; name: string }[];
}

export interface Attachment {
  id: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
}

export interface MemoryDetail extends Memory {
  content: string | null;
  keywords: string[] | null;
  attachments: Attachment[];
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  // "system" collections (onboarding defaults, AI-suggested groupings) are
  // hidden by default — see useCollectionsQuery's includeSystem param.
  source: "user" | "system";
  memoryCount: number;
  isVaulted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  memoryCount: number;
}
