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

export const batchUncollectInputSchema = z.object({
  memoryIds: z.array(z.string().uuid()).min(1),
  collectionId: z.string().uuid(),
});

export type BatchUncollectInput = z.infer<typeof batchUncollectInputSchema>;

// The Inbox: mark read (or unread again).
export const batchReadInputSchema = z.object({
  memoryIds: z.array(z.string().uuid()).min(1),
  read: z.boolean(),
});
export type BatchReadInput = z.infer<typeof batchReadInputSchema>;

// "Remind me": when they come back, with an offset; null cancels the reminders.
export const batchRemindInputSchema = z.object({
  memoryIds: z.array(z.string().uuid()).min(1),
  remindAt: z.string().datetime({ offset: true }).nullable(),
});
export type BatchRemindInput = z.infer<typeof batchRemindInputSchema>;

export const batchDeleteCollectionsInputSchema = z.object({
  collectionIds: z.array(z.string().uuid()).min(1),
  // "keep": the memories stay in the library. "trash": they go to Trash too.
  memories: z.enum(["keep", "trash"]).default("keep"),
});

export type BatchDeleteCollectionsInput = z.infer<typeof batchDeleteCollectionsInputSchema>;

export const batchMergeCollectionsInputSchema = z
  .object({
    collectionIds: z.array(z.string().uuid()).min(2),
    // The collection that keeps its name and receives everything; one of collectionIds.
    targetId: z.string().uuid(),
  })
  .refine((input) => input.collectionIds.includes(input.targetId), { message: "targetId must be one of collectionIds", path: ["targetId"] });

export type BatchMergeCollectionsInput = z.infer<typeof batchMergeCollectionsInputSchema>;

export const batchVaultCollectionsInputSchema = z.object({
  collectionIds: z.array(z.string().uuid()).min(1),
  isVaulted: z.boolean(),
});

export type BatchVaultCollectionsInput = z.infer<typeof batchVaultCollectionsInputSchema>;
