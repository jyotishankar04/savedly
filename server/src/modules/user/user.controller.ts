import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { getUserWithRoles } from "../auth/api";
import { completeOnboarding, updateProfile } from "./user.service";

export class UserController {
  static async updateProfile(req: Request, res: Response) {
    await updateProfile(req.user!.id, req.body);
    const user = await getUserWithRoles(req.user!.id);
    res.status(200).json(ApiResponse.success({ user }));
  }

  static async completeOnboarding(req: Request, res: Response) {
    await completeOnboarding(req.user!.id, req.body);
    const user = await getUserWithRoles(req.user!.id);
    res.status(200).json(ApiResponse.success({ user }));
  }
}
