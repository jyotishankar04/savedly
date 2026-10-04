import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { getInsights } from "./insights.service";

export class InsightsController {
  static async get(req: Request, res: Response) {
    const insights = await getInsights(req.user!.id);
    res.status(200).json(ApiResponse.success(insights));
  }
}
