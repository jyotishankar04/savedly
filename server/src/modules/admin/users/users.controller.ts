import type { Request, Response } from "express";
import { ApiResponse } from "../../../shared/response/api-response";
import type { ListUsersQuery } from "./users.schema";
import {
  createUserByAdmin,
  deleteUserForDev,
  getUserDetail,
  getUserPlan,
  grantPlan,
  listUsers,
  removePlanGrant,
  setUserPassword,
  updateUserRoles,
  updateUserStatus,
} from "./users.service";

export class UsersController {
  static async listUsers(req: Request, res: Response) {
    const query = req.query as unknown as ListUsersQuery;
    const result = await listUsers(query);
    res.status(200).json(ApiResponse.success(result.items, { page: result.page, limit: result.limit, total: result.total }));
  }

  static async getUser(req: Request, res: Response) {
    const user = await getUserDetail(req.params.id as string);
    res.status(200).json(ApiResponse.success(user));
  }

  static async updateRoles(req: Request, res: Response) {
    const result = await updateUserRoles(req.params.id as string, req.body, req.user!.id, req.ip);
    res.status(200).json(ApiResponse.success(result));
  }

  static async updateStatus(req: Request, res: Response) {
    const result = await updateUserStatus(req.params.id as string, req.body, req.user!.id, req.ip);
    res.status(200).json(ApiResponse.success(result));
  }

  static async createUser(req: Request, res: Response) {
    const user = await createUserByAdmin(req.body, req.user!.id, req.ip);
    res.status(201).json(ApiResponse.success(user));
  }

  static async setPassword(req: Request, res: Response) {
    await setUserPassword(req.params.id as string, req.body, req.user!.id, req.ip);
    res.status(200).json(ApiResponse.success({ updated: true }));
  }

  static async getPlan(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await getUserPlan(req.params.id as string)));
  }

  static async grantPlan(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await grantPlan(req.params.id as string, req.body, req.user!.id, req.ip)));
  }

  static async removePlanGrant(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await removePlanGrant(req.params.id as string, req.user!.id, req.ip)));
  }

  static async deleteUser(req: Request, res: Response) {
    await deleteUserForDev(req.params.id as string, req.user!.id, req.ip);
    res.status(204).send();
  }
}
