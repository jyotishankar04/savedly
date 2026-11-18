import type { Request, Response } from "express";
import { env } from "../../../config/env";
import { ApiResponse } from "../../../shared/response/api-response";
import { AppError } from "../../../shared/errors/app-error";
import { logger } from "../../../shared/utils/logger";
import { signRedditStateToken, verifyRedditStateToken } from "../../../shared/utils/jwt";
import { isRedditSavedEnabled } from "../../feature-flags/api";
import { buildRedditAuthUrl, exchangeRedditCode, isRedditConfigured } from "./reddit-client";
import {
  connectReddit,
  disconnectReddit,
  getRedditConnection,
  syncRedditSaved,
  syncRedditSavedNow,
} from "./reddit.service";

const integrationsUrl = (result?: string) =>
  `${env.FRONTEND_URL}/app/integrations${result ? `?reddit=${result}` : ""}`;

export async function isRedditSavedAvailable(): Promise<boolean> {
  return (await isRedditSavedEnabled()) && isRedditConfigured();
}

export class RedditController {
  static async status(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await getRedditConnection(req.user!.id)));
  }

  /** A page navigation: redirects to Reddit's authorization/consent screen. */
  static async connect(req: Request, res: Response) {
    if (!(await isRedditSavedAvailable())) return res.redirect(integrationsUrl());
    res.redirect(buildRedditAuthUrl(signRedditStateToken(req.user!.id)));
  }

  /** Reddit sends the browser back here with code and signed state. */
  static async callback(req: Request, res: Response) {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
    const userId = state ? verifyRedditStateToken(state) : null;

    if (error || !code || !userId) {
      logger.warn({ error, hasCode: Boolean(code), hasUserId: Boolean(userId) }, "[reddit-saved] connect callback rejected");
      return res.redirect(integrationsUrl("error"));
    }

    try {
      const tokens = await exchangeRedditCode(code);
      await connectReddit(userId, tokens);
    } catch (err) {
      logger.warn({ err }, "[reddit-saved] connect callback failed");
      return res.redirect(integrationsUrl("error"));
    }

    // Trigger initial sync asynchronously so user is redirected immediately
    void syncRedditSaved(userId).catch((err) => logger.warn({ err, userId }, "[reddit-saved] first sync failed"));
    res.redirect(integrationsUrl("connected"));
  }

  static async sync(req: Request, res: Response) {
    if (!(await isRedditSavedAvailable())) {
      throw new AppError("Reddit integration isn't available on this server", 503, "REDDIT_NOT_CONFIGURED");
    }
    res.status(200).json(ApiResponse.success(await syncRedditSavedNow(req.user!.id)));
  }

  static async disconnect(req: Request, res: Response) {
    await disconnectReddit(req.user!.id);
    res.status(200).json(ApiResponse.success({ disconnected: true }));
  }
}
