import type { Request, Response } from "express";
import { env } from "../../../config/env";
import { ApiResponse } from "../../../shared/response/api-response";
import { AppError } from "../../../shared/errors/app-error";
import { logger } from "../../../shared/utils/logger";
import { signGithubStateToken, verifyGithubStateToken } from "../../../shared/utils/jwt";
import { isGithubStarsEnabled } from "../../feature-flags/feature-flags.service";
import { buildGithubStarsAuthUrl, exchangeGithubStarsCode, isGithubStarsConfigured } from "./github-client";
import { connectGithub, disconnectGithub, getGithubConnection, syncGithubStars, syncGithubStarsNow } from "./github.service";

const integrationsUrl = (result?: string) => `${env.FRONTEND_URL}/app/integrations${result ? `?github=${result}` : ""}`;

/** Whether the GitHub stars integration can be offered on this server at all. */
export async function isGithubStarsAvailable(): Promise<boolean> {
  return (await isGithubStarsEnabled()) && (await isGithubStarsConfigured());
}

export class GithubController {
  static async status(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await getGithubConnection(req.user!.id)));
  }

  /** A page navigation, not an API call: it ends on GitHub's consent screen. */
  static async connect(req: Request, res: Response) {
    if (!(await isGithubStarsAvailable())) return res.redirect(integrationsUrl());
    res.redirect(await buildGithubStarsAuthUrl(signGithubStateToken(req.user!.id)));
  }

  /** GitHub sends the browser back here. No session is needed: the signed `state` says who started it. */
  static async callback(req: Request, res: Response) {
    const { code, state } = req.query as { code?: string; state?: string };
    const userId = state ? verifyGithubStateToken(state) : null;
    // Declined on GitHub, or a stale or forged link.
    if (!code || !userId) return res.redirect(integrationsUrl("error"));

    try {
      await connectGithub(userId, await exchangeGithubStarsCode(code));
    } catch (err) {
      logger.warn({ err }, "[github-stars] connect callback failed");
      return res.redirect(integrationsUrl("error"));
    }

    // The first sync can be several hundred repositories, so it runs after
    // the redirect; the Integrations page shows the count as it arrives.
    void syncGithubStars(userId).catch((err) => logger.warn({ err, userId }, "[github-stars] first sync failed"));
    res.redirect(integrationsUrl("connected"));
  }

  static async sync(req: Request, res: Response) {
    if (!(await isGithubStarsAvailable())) throw new AppError("GitHub stars isn't available on this server", 503, "GITHUB_NOT_CONFIGURED");
    res.status(200).json(ApiResponse.success(await syncGithubStarsNow(req.user!.id)));
  }

  static async disconnect(req: Request, res: Response) {
    await disconnectGithub(req.user!.id);
    res.status(200).json(ApiResponse.success({ disconnected: true }));
  }
}
