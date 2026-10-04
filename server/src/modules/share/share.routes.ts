import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { optionalAuthenticate } from "../../shared/middlewares/optional-authenticate";
import {
  shareUnlockRateLimiter,
  sharePublicRateLimiter,
  shareRequestRateLimiter,
} from "../../shared/middlewares/rate-limit";
import { ShareController, SharePublicController } from "./share.controller";
import {
  validateCreateShare,
  validateInviteToShare,
  validateListShares,
  validateRequestAccess,
  validateUnlockShare,
  validateUpdateShare,
} from "./share.validator";

/**
 * The public reader, mounted at /s so it mirrors the client URL and so the
 * unlock cookie can be path-scoped to just these routes.
 *
 * Kept separate from the owner router below rather than sharing one mount:
 * slugs and share uuids would otherwise collide on /:param, and the
 * distinction between "anyone may call this" and "owner only" would stop
 * being visible at a glance.
 */
export const sharePublicRouter = Router();

sharePublicRouter.use(sharePublicRateLimiter);

sharePublicRouter.get("/:slug/meta", optionalAuthenticate, SharePublicController.meta);
sharePublicRouter.get("/:slug", optionalAuthenticate, SharePublicController.get);
sharePublicRouter.post(
  "/:slug/unlock",
  shareUnlockRateLimiter,
  optionalAuthenticate,
  validateUnlockShare,
  SharePublicController.unlock
);
// Requesting access needs an account: it gives the owner a real identity to
// approve and makes anonymous spam impossible.
sharePublicRouter.post(
  "/:slug/request-access",
  authenticate,
  shareRequestRateLimiter,
  validateRequestAccess,
  SharePublicController.requestAccess
);
sharePublicRouter.delete("/:slug/request-access", authenticate, SharePublicController.cancelRequest);

export const shareOwnerRouter = Router();

shareOwnerRouter.use(authenticate);

// Static segments before "/:id" — otherwise Express matches these as an id.
shareOwnerRouter.get("/shared-with-me", ShareController.sharedWithMe);
shareOwnerRouter.get("/requests", ShareController.allRequests);
shareOwnerRouter.get("/resource/:resourceType/:resourceId", ShareController.forResource);

shareOwnerRouter.get("/", validateListShares, ShareController.list);
shareOwnerRouter.post("/", validateCreateShare, ShareController.create);
shareOwnerRouter.patch("/:id", validateUpdateShare, ShareController.update);
shareOwnerRouter.post("/:id/rotate-slug", ShareController.rotateSlug);
shareOwnerRouter.delete("/:id", ShareController.remove);

shareOwnerRouter.get("/:id/grants", ShareController.listGrants);
shareOwnerRouter.post("/:id/grants", validateInviteToShare, ShareController.invite);
shareOwnerRouter.delete("/:id/grants/:grantId", ShareController.revokeGrant);

shareOwnerRouter.get("/:id/requests", ShareController.listRequests);
shareOwnerRouter.post("/:id/requests/:requestId/approve", ShareController.approveRequest);
shareOwnerRouter.post("/:id/requests/:requestId/deny", ShareController.denyRequest);

shareOwnerRouter.get("/:id/views/summary", ShareController.viewSummary);
shareOwnerRouter.get("/:id/views", ShareController.viewers);
shareOwnerRouter.get("/:id/views/daily", ShareController.viewsDaily);
