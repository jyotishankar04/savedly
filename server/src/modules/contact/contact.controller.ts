import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { sendContactMessage } from "./contact.service";
import type { SendContactInput } from "./contact.schema";

export class ContactController {
  static async send(req: Request, res: Response, next: NextFunction) {
    try {
      await sendContactMessage(req.body as SendContactInput);
      return res.status(200).json(ApiResponse.success({ sent: true }));
    } catch (err) {
      next(err);
    }
  }
}
