import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import * as service from "./notification.service";

export class NotificationController {
  static async list(req: Request, res: Response) {
    const { items, nextCursor } = await service.listNotifications(req.user!.id, req.query as never);
    res.json(ApiResponse.success(items, { nextCursor }));
  }

  static async unreadCount(req: Request, res: Response) {
    res.json(ApiResponse.success({ count: await service.getUnreadCount(req.user!.id) }));
  }

  static async markRead(req: Request, res: Response) {
    await service.markRead(req.user!.id, req.params.id as string);
    res.status(204).send();
  }

  static async markAllRead(req: Request, res: Response) {
    await service.markAllRead(req.user!.id);
    res.status(204).send();
  }

  static async remove(req: Request, res: Response) {
    await service.deleteNotification(req.user!.id, req.params.id as string);
    res.status(204).send();
  }
}
