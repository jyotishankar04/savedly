import { validate } from "../../shared/middlewares/validate";
import { createRoadmapItemSchema, reorderRoadmapSchema, roadmapVoteParamsSchema, updateRoadmapItemSchema } from "./roadmap.schema";

export const validateRoadmapVote = validate(roadmapVoteParamsSchema, "params");
export const validateCreateRoadmapItem = validate(createRoadmapItemSchema);
export const validateUpdateRoadmapItem = validate(updateRoadmapItemSchema);
export const validateReorderRoadmap = validate(reorderRoadmapSchema);
