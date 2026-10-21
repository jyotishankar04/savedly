import { z } from "zod";
import { RoadmapStatus } from "../../db/enums";

const status = z.enum([RoadmapStatus.NOW, RoadmapStatus.NEXT]);
const points = z.array(z.string().trim().min(1).max(120)).max(6);

export const createRoadmapItemSchema = z.object({
  status,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(600),
  area: z.string().trim().max(40).nullable().optional(),
  points: points.optional(),
  isActive: z.boolean().optional(),
});

export const updateRoadmapItemSchema = createRoadmapItemSchema.partial();

/** The new order of one column (Now or Next): its item ids, top first. */
export const reorderRoadmapSchema = z.object({ status, ids: z.array(z.string().uuid()).min(1).max(200) });

export const roadmapVoteParamsSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,60}$/) });

export type CreateRoadmapItemInput = z.infer<typeof createRoadmapItemSchema>;
export type UpdateRoadmapItemInput = z.infer<typeof updateRoadmapItemSchema>;
export type ReorderRoadmapInput = z.infer<typeof reorderRoadmapSchema>;
