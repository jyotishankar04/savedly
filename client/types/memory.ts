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
  /** Null = unread, in the Inbox. */
  readAt?: string | null;
  /** When "Remind me" brings it back; in the future means snoozed. */
  remindAt?: string | null;
  /** When a reminder last brought it back. */
  remindedAt?: string | null;
  /** Passages on it were highlighted with the browser extension. */
  hasHighlights?: boolean;
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
  /** What the AI looked up on the web to understand this (a bare film or book name), with the pages it used. Null when it didn't. */
  webResearch?: { query: string; findings: string; kind: string | null; sources: { title: string; url: string }[]; at: string } | null;
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
  /** Highlighted passages, oldest first. */
  highlights?: { id: string; text: string; color: string; note: string | null; createdAt: string }[];
  /** A social post or video as read from its platform; null for any other memory. */
  socialPost?: SocialPost | null;
}

/** Mirrors server/src/modules/ai/url-processor/social/types.ts. */
export interface SocialPost {
  platform: string;
  kind: "post" | "video" | "short" | "reel";
  url: string;
  author?: { name?: string; handle?: string; url?: string; avatarUrl?: string };
  title?: string;
  text?: string;
  publishedAt?: string;
  /** A video's `src` is a file the browser plays itself; `aspect` is width / height. */
  media?: { type: "image" | "video"; url: string; thumbnailUrl?: string; src?: string; aspect?: number }[];
  stats?: { likes?: number; comments?: number; views?: number; reposts?: number };
  quoted?: { author?: string; text: string };
  durationSeconds?: number;
  chapters?: { start: number; title: string }[];
  transcript?: { language: string; auto: boolean; translatedFrom?: string; segments: { start: number; text: string }[] };
  /** The platform's own player: YouTube by id; TikTok, Instagram and Facebook by their embed address. */
  embed?: { provider: "youtube" | "tiktok" | "instagram" | "facebook"; id?: string; src?: string; aspect?: number };
  source: "api" | "oembed" | "page";
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
