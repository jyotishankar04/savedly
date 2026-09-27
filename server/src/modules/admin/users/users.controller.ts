import type { Request, Response } from "express";
import { ApiResponse } from "../../../shared/response/api-response";
import type { ListUsersQuery } from "./users.schema";
import { deleteUserForDev, getUserDetail, listUsers, updateUserRoles, updateUserStatus } from "./users.service";

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

  static async deleteUser(req: Request, res: Response) {
    await deleteUserForDev(req.params.id as string, req.user!.id, req.ip);
    res.status(204).send();
  }
}
