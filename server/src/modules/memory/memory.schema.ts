import { z } from "zod";

export const memoryTypeSchema = z.enum(["web", "video", "note", "image", "document", "voice"]);

export const attachmentInputSchema = z.object({
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
});

// Mirrors server/src/modules/ai/url-processor/types.ts's BrowserCapturePayload
// — kept as its own zod shape here (rather than importing) since this is the
// request-body contract, not the internal pipeline type; size-capped fields
// only, no raw HTML accepted (docs/URL_CAPTURE_AND_PREVIEW.md).
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
  captureMethod: z.enum(["server", "extension", "manual", "import"]).optional(),
});

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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type MemoryTypeInput = z.infer<typeof memoryTypeSchema>;
export type AttachmentInput = z.infer<typeof attachmentInputSchema>;
export type BrowserCaptureInput = z.infer<typeof browserCaptureInputSchema>;
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;
export type ListMemoriesQuery = z.infer<typeof listMemoriesQuerySchema>;
