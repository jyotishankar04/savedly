import type { Request, Response } from "express";
import { ApiResponse } from "../../../shared/response/api-response";
import type { AnalyticsRangeQuery } from "./analytics.schema";
import { getActiveUsers, getContentGrowth, getSignupsOverTime } from "./analytics.service";

export class AnalyticsController {
  static async signupsOverTime(req: Request, res: Response) {
    const query = req.query as unknown as AnalyticsRangeQuery;
    const data = await getSignupsOverTime(query);
    res.status(200).json(ApiResponse.success(data));
  }

  static async activeUsers(req: Request, res: Response) {
    const query = req.query as unknown as AnalyticsRangeQuery;
    const data = await getActiveUsers(query);
    res.status(200).json(ApiResponse.success(data));
  }

  static async contentGrowth(req: Request, res: Response) {
    const query = req.query as unknown as AnalyticsRangeQuery;
    const data = await getContentGrowth(query);
    res.status(200).json(ApiResponse.success(data));
  }
}
