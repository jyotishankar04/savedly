import { z } from "zod";
import { ROADMAP_VOTABLE_SLUGS } from "./roadmap.items";

export const roadmapVoteParamsSchema = z.object({
  slug: z.enum(ROADMAP_VOTABLE_SLUGS),
});

export type RoadmapVoteParams = z.infer<typeof roadmapVoteParamsSchema>;
