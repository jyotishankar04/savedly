import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { logAdminAction } from "../../shared/utils/audit-log";
import type { ListContactQuery, ListReportsQuery } from "./messages.schema";
import {
  deleteContactMessage,
  deleteReport,
  listContactMessages,
  listReports,
  messageCounts,
  updateContactMessage,
  updateReport,
} from "./messages.service";

export class MessagesController {
  static async counts(_req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await messageCounts()));
  }

  static async listContact(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await listContactMessages(req.query as unknown as ListContactQuery)));
  }

  static async updateContact(req: Request, res: Response) {
    const id = req.params.id as string;
    const { before, after } = await updateContactMessage(id, req.body.status);
    await logAdminAction({ adminUserId: req.user!.id, action: "contact_message.status", targetType: "contact_message", targetId: id, beforeValue: { status: before.status }, afterValue: { status: after.status }, ipAddress: req.ip });
    res.status(200).json(ApiResponse.success(after));
  }

  static async removeContact(req: Request, res: Response) {
    const row = await deleteContactMessage(req.params.id as string);
    await logAdminAction({ adminUserId: req.user!.id, action: "contact_message.deleted", targetType: "contact_message", targetId: row.id, ipAddress: req.ip });
    res.status(200).json(ApiResponse.success({ id: row.id }));
  }

  static async listReports(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await listReports(req.query as unknown as ListReportsQuery)));
  }

  static async updateReport(req: Request, res: Response) {
    const id = req.params.id as string;
    const { before, after } = await updateReport(id, req.body.status);
    await logAdminAction({ adminUserId: req.user!.id, action: "report.status", targetType: "report", targetId: id, beforeValue: { status: before.status }, afterValue: { status: after.status }, ipAddress: req.ip });
    res.status(200).json(ApiResponse.success(after));
  }

  static async removeReport(req: Request, res: Response) {
    const row = await deleteReport(req.params.id as string);
    await logAdminAction({ adminUserId: req.user!.id, action: "report.deleted", targetType: "report", targetId: row.id, ipAddress: req.ip });
    res.status(200).json(ApiResponse.success({ id: row.id }));
  }
}
