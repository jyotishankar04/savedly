import { z } from "zod";

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).default("📁"),
  description: z.string().optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).optional(),
  description: z.string().optional(),
  isVaulted: z.boolean().optional(),
});

export const listCollectionsQuerySchema = z.object({
  // System collections stay hidden unless requested (the "show system collections" toggle sends
  // includeSystem=true).
  includeSystem: z.coerce.boolean().default(false),
  // Like memories' isVaulted: hidden by default, and shown only once requireVaultUnlockedForQuery
  // has confirmed the PIN.
  isVaulted: z.coerce.boolean().default(false),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type ListCollectionsQuery = z.infer<typeof listCollectionsQuerySchema>;

export const collectionIdParamsSchema = z.object({ id: z.string().uuid() });
