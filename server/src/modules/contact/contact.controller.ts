import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { sendContactMessage } from "./contact.service";
import type { SendContactInput } from "./contact.schema";

export class ContactController {
  static async send(req: Request, res: Response) {
    const { id } = await sendContactMessage(req.body as SendContactInput, req.user?.id ?? null);
    res.status(200).json(ApiResponse.success({ sent: true, id }));
  }
}
