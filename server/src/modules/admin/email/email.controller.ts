import type { Request, Response } from "express";
import { ApiResponse } from "../../../shared/response/api-response";
import type { ListCampaignMessagesQuery, ListCampaignsQuery, SendEmailInput } from "./email.schema";
import { getCampaignMessages, listCampaigns, sendAdminEmail } from "./email.service";

export class AdminEmailController {
  static async send(req: Request, res: Response) {
    const body = req.body as SendEmailInput;
    const result = await sendAdminEmail(body, req.user!.id);
    res.status(201).json(ApiResponse.success(result));
  }

  static async list(req: Request, res: Response) {
    const query = req.query as unknown as ListCampaignsQuery;
    const result = await listCampaigns(query);
    res.status(200).json(ApiResponse.success(result.items, { page: result.page, limit: result.limit, total: result.total }));
  }

  static async messages(req: Request, res: Response) {
    const query = req.query as unknown as ListCampaignMessagesQuery;
    const result = await getCampaignMessages(req.params.id as string, query);
    res
      .status(200)
      .json(
        ApiResponse.success(result.items, {
          page: result.page,
          limit: result.limit,
          total: result.total,
          summary: result.summary,
          campaign: result.campaign,
        }),
      );
  }
}
