import { z } from "zod";
import { AnnouncementDisplayMode, AnnouncementType } from "../../db/enums";

export const createAnnouncementSchema = z.object({
  type: z.enum([AnnouncementType.COUNTDOWN, AnnouncementType.ANNOUNCEMENT, AnnouncementType.UPDATE]),
  displayMode: z.enum([AnnouncementDisplayMode.BANNER, AnnouncementDisplayMode.FULL_PAGE]).optional(),
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  targetDate: z.string().datetime().nullable().optional(),
  ctaLabel: z.string().max(100).nullable().optional(),
  ctaUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  // Opt-in only — re-editing an already-announced item uses the update
  // schema below, which deliberately omits this, so a later edit never
  // silently re-blasts everyone.
  notifyByEmail: z.boolean().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.omit({ notifyByEmail: true }).partial();

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
