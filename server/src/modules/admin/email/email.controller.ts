import type { Request, Response } from "express";
import { ApiResponse } from "../../../shared/response/api-response";
import type { ListCampaignMessagesQuery, ListCampaignsQuery, PreviewEmailInput, SendEmailInput } from "./email.schema";
import { getCampaignMessages, listCampaigns, previewAdminEmail, sendAdminEmail, sendTestAdminEmail } from "./email.service";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { AppError } from "../../../shared/errors/app-error";
import { sendWeeklyDigestTo } from "../../memory/weekly-digest.job";

export class AdminEmailController {
  static async send(req: Request, res: Response) {
    const body = req.body as SendEmailInput;
    const result = await sendAdminEmail(body, req.user!.id);
    res.status(201).json(ApiResponse.success(result));
  }

  static preview(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(previewAdminEmail(req.body as PreviewEmailInput)));
  }

  static async sendTest(req: Request, res: Response) {
    const result = await sendTestAdminEmail(req.body as PreviewEmailInput, req.user!.id);
    res.status(201).json(ApiResponse.success(result));
  }

  static async sendWeeklyDigestTest(req: Request, res: Response) {
    const [me] = await db.select({ id: users.id, email: users.email, name: users.name }).from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!me) throw new AppError("Your account wasn't found.", 404);
    const sent = await sendWeeklyDigestTo(me);
    if (!sent) throw new AppError("Your Inbox has nothing unread, so there's nothing to put in the email. Save something first.", 409, "NOTHING_TO_SEND");
    res.status(201).json(ApiResponse.success({ to: me.email }));
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
