import { z } from "zod";

export const memoryTypeSchema = z.enum(["web", "video", "note", "image", "document", "voice"]);

export const attachmentInputSchema = z.object({
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
});

// Mirrors BrowserCapturePayload in url-processor/types.ts, kept as its own shape because this is
// the request contract, not the internal type. Size-capped fields only; no raw HTML
// (docs/URL_CAPTURE_AND_PREVIEW.md).
export const browserCaptureInputSchema = z.object({
  title: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  canonicalUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  platform: z.string().max(50).optional(),
  resourceType: z.string().max(50).optional(),
  selectedText: z.string().max(5000).optional(),
  capturedAt: z.string().optional(),
});

export const createMemorySchema = z.object({
  type: memoryTypeSchema,
  url: z.string().url().optional(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  faviconUrl: z.string().url().optional(),
  previewImageUrl: z.string().url().optional(),
  keywords: z.array(z.string().max(50)).max(20).optional(),
  collectionIds: z.array(z.string().uuid()).max(50).optional(),
  tags: z.array(z.string().min(1).max(50)).max(30).optional(),
  attachments: z.array(attachmentInputSchema).max(10).optional(),
  // How this memory was originally captured — defaults to "manual" (web
  // dashboard) in the service layer when omitted.
  captureMethod: z.enum(["server", "extension", "manual", "mobile", "import"]).optional(),
  // What to do when this is already in the library. "ask": don't save, answer 409 with the existing
  // memory. "allow": save anyway. Omitted (extension, share, API): save, and the pipeline's
  // duplicate check leaves a notification.
  onDuplicate: z.enum(["ask", "allow"]).optional(),
  // A note that's still being written (the full-page editor saves as you
  // type): processed once writing stops, not on this first save.
  editing: z.boolean().optional(),
});

// A note's "Write with AI" (rewrite.service.ts): the note as it is in the
// editor now, which may be ahead of what's saved.
export const rewriteNoteSchema = z.object({
  mode: z.enum(["fix", "improve", "shorten"]),
  markdown: z.string().min(1).max(20_000, "This note is too long to rewrite at once. Try a part of it."),
  // Only a part of the note: what's selected in the editor.
  part: z.boolean().optional(),
  // Words inside one paragraph: the text around them, so the rewrite fits back in.
  context: z.object({ before: z.string().max(400), after: z.string().max(400) }).optional(),
});

// Titles for a note (rewrite.service.ts suggestNoteTitles), from the note as it is in the editor.
export const suggestNoteTitlesSchema = z.object({
  title: z.string().max(500),
  markdown: z.string().max(20_000),
});

export const resolveDuplicateSchema = z.object({ action: z.enum(["skip", "keep"]) });

export const updateMemorySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  inTrash: z.boolean().optional(),
  isVaulted: z.boolean().optional(),
  // Null explicitly clears it (removing the event); undefined leaves it
  // untouched, same "omit vs. null" convention as every other optional
  // field here.
  eventAt: z.string().datetime().nullable().optional(),
  collectionIds: z.array(z.string().uuid()).max(50).optional(),
  tags: z.array(z.string().min(1).max(50)).max(30).optional(),
  attachments: z.array(attachmentInputSchema).max(10).optional(),
  // The Inbox: true marks it read, false puts it back as unread.
  isRead: z.boolean().optional(),
  // "Remind me": when it should come back (with an offset); null cancels.
  remindAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const listMemoriesQuerySchema = z.object({
  type: memoryTypeSchema.optional(),
  isFavorite: z.coerce.boolean().optional(),
  isArchived: z.coerce.boolean().optional(),
  inTrash: z.coerce.boolean().optional(),
  isVaulted: z.coerce.boolean().optional(),
  collectionId: z.string().uuid().optional(),
  tag: z.string().optional(),
  // A site the memory came from, e.g. "github" or "github.com": matched
  // case-insensitively against its source domain or URL.
  site: z.string().trim().min(1).max(100).optional(),
  q: z.string().optional(),
  // "true" only. Not z.coerce.boolean(), which reads the string "false" as true.
  inbox: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  snoozed: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type MemoryTypeInput = z.infer<typeof memoryTypeSchema>;
export type AttachmentInput = z.infer<typeof attachmentInputSchema>;
export type BrowserCaptureInput = z.infer<typeof browserCaptureInputSchema>;
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;
export type ListMemoriesQuery = z.infer<typeof listMemoriesQuerySchema>;

// The extension, before saving: which collection and tags fit this page.
export const suggestForPageSchema = z.object({
  url: z.string().url(),
  title: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});
