import type { Request, Response } from "express";
import { ApiResponse } from "../../../shared/response/api-response";
import type { CreatePlanInput, UpdatePlanInput } from "./plans.schema";
import { createPlan, listAllPlans, updatePlan } from "./plans.service";
import { getPlanGrantsSummary } from "./plan-grants.service";

export class AdminPlansController {
  static async list(_req: Request, res: Response) {
    const plans = await listAllPlans();
    res.status(200).json(ApiResponse.success(plans));
  }

  static async grantsSummary(_req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await getPlanGrantsSummary()));
  }

  static async create(req: Request, res: Response) {
    const plan = await createPlan(req.body as CreatePlanInput, req.user!.id, req.ip);
    res.status(201).json(ApiResponse.success(plan));
  }

  static async update(req: Request, res: Response) {
    const plan = await updatePlan(req.params.id as string, req.body as UpdatePlanInput, req.user!.id, req.ip);
    res.status(200).json(ApiResponse.success(plan));
  }
}
