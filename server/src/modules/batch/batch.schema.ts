import { z } from "zod";

export const batchTagInputSchema = z.object({
  memoryIds: z.array(z.string().uuid()).min(1),
  tagNames: z.array(z.string().min(1).max(50)).min(1),
  mode: z.enum(["add", "remove", "replace"]).default("add"),
});

export type BatchTagInput = z.infer<typeof batchTagInputSchema>;

export const batchMoveToCollectionInputSchema = z.object({
  memoryIds: z.array(z.string().uuid()).min(1),
  collectionId: z.string().uuid(),
  mode: z.enum(["add", "move"]).default("add"),
});

export type BatchMoveToCollectionInput = z.infer<typeof batchMoveToCollectionInputSchema>;

export const batchDeleteInputSchema = z.object({
  memoryIds: z.array(z.string().uuid()).min(1),
  permanent: z.boolean().default(false),
});

export type BatchDeleteInput = z.infer<typeof batchDeleteInputSchema>;

export const batchRestoreInputSchema = z.object({
  memoryIds: z.array(z.string().uuid()).min(1),
});

export type BatchRestoreInput = z.infer<typeof batchRestoreInputSchema>;

export const batchUpdateStatusInputSchema = z.object({
  memoryIds: z.array(z.string().uuid()).min(1),
  archived: z.boolean().optional(),
  favorite: z.boolean().optional(),
  vaulted: z.boolean().optional(),
});

export type BatchUpdateStatusInput = z.infer<typeof batchUpdateStatusInputSchema>;

export interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}
