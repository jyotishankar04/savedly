import { z } from "zod";

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).default("folder-outline"),
  description: z.string().optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).optional(),
  description: z.string().optional(),
  isVaulted: z.boolean().optional(),
});

export const listCollectionsQuerySchema = z.object({
  // System collections (onboarding defaults, AI-suggested groupings) stay
  // hidden unless explicitly requested — the app's "show system collections"
  // toggle sends includeSystem=true.
  includeSystem: z.coerce.boolean().default(false),
  // Same shape as memories' isVaulted toggle — hidden by default, shown
  // only when explicitly requested, and only once the vault route guard
  // (requireVaultUnlockedForQuery) has confirmed the PIN was entered.
  isVaulted: z.coerce.boolean().default(false),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type ListCollectionsQuery = z.infer<typeof listCollectionsQuerySchema>;
