import { z } from "zod";
import { WhatsNewKind } from "../../db/enums";

// A link inside the site ("/pricing") or a full https address.
const linkSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), "Use a path starting with / or a full https:// address");

export const createWhatsNewSchema = z.object({
  kind: z.enum([WhatsNewKind.NEW, WhatsNewKind.IMPROVED, WhatsNewKind.UPCOMING]).optional(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(600).nullable().optional(),
  bullets: z.array(z.string().trim().min(1).max(160)).max(6).optional(),
  imageUrl: z.string().trim().url().max(1000).nullable().optional(),
  ctaLabel: z.string().trim().min(1).max(60).nullable().optional(),
  ctaUrl: linkSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateWhatsNewSchema = createWhatsNewSchema.partial();

export const reorderWhatsNewSchema = z.object({
  // Every item's id, in the order the stack should show them.
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export type CreateWhatsNewInput = z.infer<typeof createWhatsNewSchema>;
export type UpdateWhatsNewInput = z.infer<typeof updateWhatsNewSchema>;
export type ReorderWhatsNewInput = z.infer<typeof reorderWhatsNewSchema>;
