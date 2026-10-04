import type { Request, Response } from "express";
import { ApiResponse } from "../../../shared/response/api-response";
import type { AuditLogQuery } from "./audit-log.schema";
import { getAuditLog } from "./audit-log.service";

export class AuditLogController {
  static async auditLog(req: Request, res: Response) {
    const query = req.query as unknown as AuditLogQuery;
    const result = await getAuditLog(query);
    res.status(200).json(ApiResponse.success(result.items, { page: result.page, limit: result.limit, total: result.total }));
  }
}
