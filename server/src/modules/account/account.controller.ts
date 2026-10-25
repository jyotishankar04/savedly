import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { clearAuthCookies } from "../../shared/utils/cookies";
import type { ClearMemoriesInput, DeleteAccountInput } from "./account.schema";
import { deleteAllMemoriesNow, hardDeleteAccount, softDeleteAccount, trashAllMemories } from "./account.service";

export class AccountController {
  static async clearMemories(req: Request, res: Response) {
    const { mode } = req.body as ClearMemoriesInput;
    const userId = req.user!.id;

    if (mode === "trash") {
      const count = await trashAllMemories(userId);
      return res.status(200).json(ApiResponse.success({ mode, count }));
    }

    const { deleted, failed, collections, tags } = await deleteAllMemoriesNow(userId);
    res.status(200).json(ApiResponse.success({ mode, deleted, failed, collections, tags }));
  }

  static async deleteAccount(req: Request, res: Response) {
    const { mode } = req.body as DeleteAccountInput;
    const userId = req.user!.id;

    if (mode === "soft") {
      await softDeleteAccount(userId);
    } else {
      await hardDeleteAccount(userId);
    }

    // Either mode kills the caller's session, so their cookie is stale.
    clearAuthCookies(res);
    res.status(200).json(ApiResponse.success({ mode }));
  }
}
