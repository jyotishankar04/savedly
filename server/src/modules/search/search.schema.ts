import { z } from "zod";

export const advancedSearchInputSchema = z.object({
  // Boolean search: "vacation AND (photos OR memories)" — supports AND, OR, NOT, parentheses
  query: z.string().min(1).max(1000).optional(),
  // Filter by creation date range
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  // Filter by tags (any/all match)
  tagIds: z.array(z.string().uuid()).optional(),
  tagMode: z.enum(["any", "all"]).default("any"),
  // Filter by collection
  collectionIds: z.array(z.string().uuid()).optional(),
  // Filter by memory type
  types: z.array(z.enum(["web", "video", "note", "image", "document", "voice"])).optional(),
  // Filter by status
  statuses: z.array(z.enum(["processing", "ready", "partial", "failed"])).optional(),
  // Filter by properties
  archived: z.boolean().optional(),
  favorite: z.boolean().optional(),
  vaulted: z.boolean().optional(),
  inTrash: z.boolean().optional(),
  // Sort options
  sortBy: z.enum(["relevance", "recent", "oldest", "title", "updated"]).default("relevance"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  // Pagination
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type AdvancedSearchInput = z.infer<typeof advancedSearchInputSchema>;

export const saveSearchSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  searchInput: advancedSearchInputSchema,
});

export type SaveSearchInput = z.infer<typeof saveSearchSchema>;

export const savedSearchSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  searchInput: advancedSearchInputSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SavedSearch = z.infer<typeof savedSearchSchema>;
