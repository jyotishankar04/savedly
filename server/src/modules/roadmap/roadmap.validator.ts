import { validate } from "../../shared/middlewares/validate";
import { roadmapVoteParamsSchema } from "./roadmap.schema";

export const validateRoadmapVote = validate(roadmapVoteParamsSchema, "params");
