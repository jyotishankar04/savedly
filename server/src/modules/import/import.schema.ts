import { z } from "zod";
import { ImportSourceType } from "../../db/enums";

// Mirrors the email module's recipients.userIds.max(5000) cap precedent —
// bounds worst-case ingestion-queue load from one request.
export const IMPORT_MAX_URLS = 1000;

export const importSchema = z.object({
  sourceType: z.enum([ImportSourceType.BOOKMARKS_HTML, ImportSourceType.URL_LIST]),
  content: z.string().min(1).max(5_000_000),
});

export const listImportItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ImportInput = z.infer<typeof importSchema>;
export type ListImportItemsQuery = z.infer<typeof listImportItemsQuerySchema>;
