import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { logAdminAction } from "../../shared/utils/audit-log";
import { createWhatsNew, deleteWhatsNew, listActiveWhatsNew, listWhatsNew, reorderWhatsNew, updateWhatsNew } from "./whats-new.service";

export class WhatsNewController {
  static async active(_req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await listActiveWhatsNew()));
  }

  static async list(_req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await listWhatsNew()));
  }

  static async create(req: Request, res: Response) {
    const row = await createWhatsNew(req.body, req.user!.id);
    await logAdminAction({
      adminUserId: req.user!.id,
      action: "whats_new.created",
      targetType: "whats_new_item",
      targetId: row.id,
      afterValue: row,
      ipAddress: req.ip,
    });
    res.status(201).json(ApiResponse.success(row));
  }

  static async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const { before, after } = await updateWhatsNew(id, req.body);
    await logAdminAction({
      adminUserId: req.user!.id,
      action: "whats_new.updated",
      targetType: "whats_new_item",
      targetId: id,
      beforeValue: before,
      afterValue: after,
      ipAddress: req.ip,
    });
    res.status(200).json(ApiResponse.success(after));
  }

  static async reorder(req: Request, res: Response) {
    const rows = await reorderWhatsNew(req.body);
    await logAdminAction({
      adminUserId: req.user!.id,
      action: "whats_new.reordered",
      targetType: "whats_new_item",
      afterValue: { ids: req.body.ids },
      ipAddress: req.ip,
    });
    res.status(200).json(ApiResponse.success(rows));
  }

  static async remove(req: Request, res: Response) {
    const id = req.params.id as string;
    const row = await deleteWhatsNew(id);
    await logAdminAction({
      adminUserId: req.user!.id,
      action: "whats_new.deleted",
      targetType: "whats_new_item",
      targetId: id,
      beforeValue: row,
      ipAddress: req.ip,
    });
    res.status(200).json(ApiResponse.success({ id: row.id }));
  }
}
