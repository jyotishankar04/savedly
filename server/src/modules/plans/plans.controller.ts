import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { getMyPlanSummary, listPublicPlans } from "./plans.service";

export class PlansController {
  static async listPublic(_req: Request, res: Response) {
    const plans = await listPublicPlans();
    res.status(200).json(ApiResponse.success(plans));
  }

  static async me(req: Request, res: Response) {
    const summary = await getMyPlanSummary(req.user!.id);
    res.status(200).json(ApiResponse.success(summary));
  }
}
