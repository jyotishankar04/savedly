import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { createReport } from "./report.service";
import type { CreateReportInput } from "./report.schema";

export class ReportController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as CreateReportInput;
      const result = await createReport(input, req.user?.id ?? null);
      return res.status(201).json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }
}
