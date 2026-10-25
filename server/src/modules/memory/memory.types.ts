import type { db } from "../../db";
import type { SocialPost } from "../ai/api";

// What the memory module hands out (list item, detail, shared transaction type), kept apart so code
// needing only shapes doesn't depend on the service.

export interface MemoryListItem {
  id: string;
  type: string;
  title: string;
  url: string | null;
  description: string | null;
  source: string | null;
  faviconUrl: string | null;
  previewImageUrl: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  inTrash: boolean;
  trashedAt: Date | null;
  isVaulted: boolean;
  /** Null = unread, in the Inbox. */
  readAt: Date | null;
  /** When it comes back ("Remind me"); in the future = snoozed. */
  remindAt: Date | null;
  /** When a reminder last brought it back. */
  remindedAt: Date | null;
  /** Whether passages on it were highlighted (the extension's highlighter). */
  hasHighlights: boolean;
  eventAt: Date | null;
  /** How long the event runs, in minutes; null means 1 hour. */
  eventDurationMinutes: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  // AI ingestion output (docs/AI_REQUIREMENTS.md); null until the pipeline finishes.
  resourceCategory: string | null;
  inferredIntent: string | null;
  contentType: string | null;
  extractedFields: Record<string, string> | null;
  /** What the AI looked up on the web to understand it, with the pages it used; null when it didn't. */
  webResearch: { query: string; findings: string; kind: string | null; sources: { title: string; url: string }[]; at: string } | null;
  // URL capture and preview (docs/URL_CAPTURE_AND_PREVIEW.md): status is always set (defaults to
  // "processing"); the preview fields stay null until ingestion runs, and for non-links.
  status: string;
  previewStatus: string | null;
  previewSource: string | null;
  platform: string | null;
  resourceType: string | null;
  canonicalUrl: string | null;
  captureMethod: string | null;
  collections: { id: string; name: string }[];
}

export interface AttachmentResponse {
  id: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: Date;
}

export interface MemoryDetail extends MemoryListItem {
  /** Passages highlighted on the page, oldest first. */
  highlights: { id: string; text: string; color: string; note: string | null; createdAt: Date }[];
  content: string | null;
  keywords: string[] | null;
  attachments: AttachmentResponse[];
  /** A social post or video as read from its platform (url-processor/social), transcript included. */
  socialPost: SocialPost | null;
}

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
