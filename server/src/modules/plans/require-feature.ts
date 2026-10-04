import type { NextFunction, Request, Response } from "express";
import { assertFeature, type PlanFeature } from "./plans.service";

/** Route guard: 403 PLAN_FEATURE_REQUIRED unless the signed-in user's plan has `feature`. Put it after authenticate. */
export function requireFeature(feature: PlanFeature) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await assertFeature(req.user!.id, feature);
      next();
    } catch (err) {
      next(err);
    }
  };
}
