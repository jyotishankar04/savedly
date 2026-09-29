import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { createCheckout, createPortalLink, handleWebhook, syncSubscriptions } from "./billing.service";
import type { CheckoutInput } from "./billing.schema";

export class BillingController {
  static async checkout(req: Request, res: Response) {
    const { planKey } = req.body as CheckoutInput;
    res.status(200).json(ApiResponse.success(await createCheckout(req.user!.id, planKey)));
  }

  static async portal(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await createPortalLink(req.user!.id)));
  }

  static async sync(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await syncSubscriptions(req.user!.id)));
  }

  /** The provider calls this directly. The body is the raw Buffer from app.ts's express.raw() mount, needed to verify the signature. */
  static async webhook(req: Request, res: Response) {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers[key.toLowerCase()] = value;
    }
    await handleWebhook(rawBody, headers);
    res.status(200).json(ApiResponse.success({ received: true }));
  }
}
