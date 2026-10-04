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

    const { deleted, failed } = await deleteAllMemoriesNow(userId);
    res.status(200).json(ApiResponse.success({ mode, deleted, failed }));
  }

  static async deleteAccount(req: Request, res: Response) {
    const { mode } = req.body as DeleteAccountInput;
    const userId = req.user!.id;

    if (mode === "soft") {
      await softDeleteAccount(userId);
    } else {
      await hardDeleteAccount(userId);
    }

    // Either mode leaves the caller's own session dead — soft revokes every
    // session server-side, hard removes the user row entirely — so the
    // client's existing cookie is stale either way.
    clearAuthCookies(res);
    res.status(200).json(ApiResponse.success({ mode }));
  }
}
