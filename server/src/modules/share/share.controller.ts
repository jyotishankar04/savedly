import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { AppError } from "../../shared/errors/app-error";
import { setShareTokenCookie } from "../../shared/utils/cookies";
import { signShareToken } from "../../shared/utils/jwt";
import { ShareResourceType } from "../../db/enums";
import { getSharedPayload, readUnlockedShares, resolveShareAccess } from "./share.access";
import { verifyPassword as verifySharePassword } from "../../shared/crypto/scrypt-password";
import { getShareViewSummary, getShareViewsDaily, listShareViewers, recordShareView } from "./share.views";
import { assertFeature } from "../plans/plans.service";
import { getClientIp } from "../../shared/utils/device-fingerprint";
import * as shareService from "./share.service";

/**
 * Turns a gate decision into the HTTP error the client branches on.
 *
 * auth_required is 401, not 403, on purpose: optionalAuthenticate silently
 * drops an *expired* access token, so a legitimate grantee returning after
 * their 15-minute token lapsed would otherwise be told to request access
 * they already have. The client's refresh interceptor only fires on 401,
 * so this gives it the chance to refresh and retry.
 */
function gateError(decision: Exclude<ReturnType<typeof describe>, null>): AppError {
  switch (decision.code) {
    case "SHARE_AUTH_REQUIRED":
      return new AppError("Sign in to continue", 401, decision.code, decision.details);
    case "NOT_FOUND":
      return new AppError("Not found", 404, decision.code);
    default:
      return new AppError(decision.message, 403, decision.code, decision.details);
  }
}

function describe(decision: Awaited<ReturnType<typeof resolveShareAccess>>) {
  switch (decision.outcome) {
    case "allow":
      return null;
    case "not_found":
      return { code: "NOT_FOUND" as const, message: "Not found", details: undefined };
    case "password_required":
      return {
        code: "SHARE_PASSWORD_REQUIRED" as const,
        message: "This link is password protected",
        details: { share: decision.stub },
      };
    case "auth_required":
      return {
        code: "SHARE_AUTH_REQUIRED" as const,
        message: "Sign in to continue",
        details: { share: decision.stub },
      };
    case "request_required":
      return {
        code:
          decision.myRequest === "pending"
            ? ("SHARE_ACCESS_PENDING" as const)
            : decision.myRequest === "denied"
              ? ("SHARE_ACCESS_DENIED" as const)
              : ("SHARE_ACCESS_REQUIRED" as const),
        message:
          decision.myRequest === "pending"
            ? "Your request is waiting for a decision"
            : decision.myRequest === "denied"
              ? "Your request was declined"
              : "Ask the owner for access",
        details: { share: decision.stub, myRequest: decision.myRequest },
      };
  }
}

export class SharePublicController {
  /** Cheap metadata for the page's generateMetadata — never the contents. */
  static async meta(req: Request, res: Response) {
    const decision = await resolveShareAccess(
      req.params.slug as string,
      req.user?.id ?? null,
      readUnlockedShares(req)
    );

    if (decision.outcome === "not_found") {
      throw new AppError("Not found", 404, "NOT_FOUND");
    }

    if (decision.outcome !== "allow") {
      // A gated link exposes only the stub: no real title, so nothing
      // meaningful can reach a crawler or a link unfurler.
      return res.json(
        ApiResponse.success({
          mode: "gated" as const,
          gate: describe(decision)!.code,
          share: decision.stub,
        })
      );
    }

    const payload = await getSharedPayload(decision.share);
    res.json(
      ApiResponse.success({
        mode: "open" as const,
        // Indexing is only ever honoured for a genuinely public link.
        allowSearchIndexing: payload.allowSearchIndexing && decision.via === "public",
        isPublic: decision.via === "public",
        resourceType: payload.resourceType,
        title: payload.collection?.name ?? payload.memories[0]?.title ?? "Shared",
        description: payload.collection?.description ?? payload.memories[0]?.description ?? null,
        ownerName: payload.ownerName,
        memoryCount: payload.memories.length,
      })
    );
  }

  static async get(req: Request, res: Response) {
    const decision = await resolveShareAccess(
      req.params.slug as string,
      req.user?.id ?? null,
      readUnlockedShares(req)
    );

    const problem = describe(decision);
    if (problem) throw gateError(problem);
    if (decision.outcome !== "allow") return;

    recordShareView(decision.share.id, req.user?.id ?? null, getClientIp(req));
    const payload = await getSharedPayload(decision.share);

    if (!payload.allowSearchIndexing || decision.via !== "public") {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }

    res.json(ApiResponse.success(payload));
  }

  static async unlock(req: Request, res: Response) {
    const decision = await resolveShareAccess(
      req.params.slug as string,
      req.user?.id ?? null,
      readUnlockedShares(req)
    );

    // Only a link that is actually asking for a password can be unlocked.
    // Anything else gets the same 404 an unknown slug does.
    if (decision.outcome === "not_found") throw new AppError("Not found", 404, "NOT_FOUND");

    const share =
      decision.outcome === "allow"
        ? decision.share
        : decision.outcome === "password_required"
          ? await shareService.getShareBySlugForUnlock(req.params.slug as string)
          : null;

    if (!share) throw new AppError("Not found", 404, "NOT_FOUND");

    const ok = await verifySharePassword(req.body.password, share.passwordHash);
    if (!ok) throw new AppError("Incorrect password", 401, "SHARE_PASSWORD_INCORRECT");

    // Carry forward any other links this browser already unlocked, so
    // opening a second protected share doesn't sign you out of the first.
    const existing = readUnlockedShares(req).filter((entry) => entry.id !== share.id);
    const pv = share.passwordUpdatedAt?.getTime() ?? 0;
    setShareTokenCookie(res, signShareToken({ typ: "share", shares: [...existing, { id: share.id, pv }] }));

    res.json(ApiResponse.success({ unlocked: true }));
  }

  static async requestAccess(req: Request, res: Response) {
    const result = await shareService.requestAccess(req.user!.id, req.params.slug as string, req.body.message);
    res.status(201).json(ApiResponse.success(result));
  }

  static async cancelRequest(req: Request, res: Response) {
    await shareService.cancelAccessRequest(req.user!.id, req.params.slug as string);
    res.status(204).send();
  }
}

export class ShareController {
  static async list(req: Request, res: Response) {
    const data = await shareService.listMyShares(req.user!.id, req.query as never);
    res.json(ApiResponse.success(data));
  }

  static async sharedWithMe(req: Request, res: Response) {
    res.json(ApiResponse.success(await shareService.listSharedWithMe(req.user!.id)));
  }

  static async allRequests(req: Request, res: Response) {
    res.json(ApiResponse.success(await shareService.listRequestsForOwner(req.user!.id)));
  }

  /** Returns null rather than 404 when unshared — the dialog opens on this. */
  static async forResource(req: Request, res: Response) {
    const data = await shareService.getShareForResource(
      req.user!.id,
      req.params.resourceType as ShareResourceType,
      req.params.resourceId as string
    );
    res.json(ApiResponse.success(data));
  }

  static async create(req: Request, res: Response) {
    res.status(201).json(ApiResponse.success(await shareService.getOrCreateShare(req.user!.id, req.body)));
  }

  static async update(req: Request, res: Response) {
    res.json(ApiResponse.success(await shareService.updateShare(req.user!.id, req.params.id as string, req.body)));
  }

  static async rotateSlug(req: Request, res: Response) {
    res.json(ApiResponse.success(await shareService.rotateShareSlug(req.user!.id, req.params.id as string)));
  }

  static async remove(req: Request, res: Response) {
    await shareService.deleteShare(req.user!.id, req.params.id as string);
    res.status(204).send();
  }

  static async listGrants(req: Request, res: Response) {
    res.json(ApiResponse.success(await shareService.listGrants(req.user!.id, req.params.id as string)));
  }

  static async invite(req: Request, res: Response) {
    res
      .status(201)
      .json(ApiResponse.success(await shareService.inviteByEmail(req.user!.id, req.params.id as string, req.body.email)));
  }

  static async revokeGrant(req: Request, res: Response) {
    await shareService.revokeGrant(req.user!.id, req.params.id as string, req.params.grantId as string);
    res.status(204).send();
  }

  static async listRequests(req: Request, res: Response) {
    res.json(ApiResponse.success(await shareService.listRequestsForOwner(req.user!.id, req.params.id as string)));
  }

  static async approveRequest(req: Request, res: Response) {
    await shareService.approveAccessRequest(req.user!.id, req.params.id as string, req.params.requestId as string);
    res.status(204).send();
  }

  static async denyRequest(req: Request, res: Response) {
    await shareService.denyAccessRequest(req.user!.id, req.params.id as string, req.params.requestId as string);
    res.status(204).send();
  }

  static async viewSummary(req: Request, res: Response) {
    res.json(ApiResponse.success(await getShareViewSummary(req.user!.id, req.params.id as string)));
  }

  // The total view count is on every plan; the daily chart and the list of
  // who viewed are plan features.
  static async viewers(req: Request, res: Response) {
    await assertFeature(req.user!.id, "shareAnalyticsViewers");
    res.json(ApiResponse.success(await listShareViewers(req.user!.id, req.params.id as string)));
  }

  static async viewsDaily(req: Request, res: Response) {
    await assertFeature(req.user!.id, "shareAnalyticsDaily");
    res.json(ApiResponse.success(await getShareViewsDaily(req.user!.id, req.params.id as string)));
  }
}
