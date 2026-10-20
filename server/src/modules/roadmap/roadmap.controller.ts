import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import type { RoadmapSlug } from "./roadmap.items";
import { addRoadmapVote, removeRoadmapVote, roadmapVotesFor } from "./roadmap.service";

export class RoadmapController {
  static async votes(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await roadmapVotesFor(req.user?.id ?? null)));
  }

  static async vote(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await addRoadmapVote(req.params.slug as RoadmapSlug, req.user!.id)));
  }

  static async unvote(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await removeRoadmapVote(req.params.slug as RoadmapSlug, req.user!.id)));
  }
}
