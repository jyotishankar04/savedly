import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireAdmin } from "../../../shared/middlewares/require-admin";
import { ApiResponse } from "../../../shared/response/api-response";
import { AppError } from "../../../shared/errors/app-error";
import { env } from "../../../config/env";
import { getSystemStatus } from "./system.service";
import { SETUP_ITEMS, getSetupStatus, setSetupSkipped, type SetupItemId } from "./setup.service";

// Mounted at /admin/system by ../index.ts. Self-hosted installs only — the
// hosted service has its own monitoring.
const router = Router();

router.get("/", authenticate, requireAdmin, async (_req: Request, res: Response) => {
  if (!env.SELF_HOSTED) throw new AppError("Not found", 404, "NOT_FOUND");
  res.status(200).json(ApiResponse.success(await getSystemStatus()));
});

// The setup panel in the dashboard: what's still to decide on a new install.
router.get("/setup", authenticate, requireAdmin, async (_req: Request, res: Response) => {
  if (!env.SELF_HOSTED) throw new AppError("Not found", 404, "NOT_FOUND");
  res.status(200).json(ApiResponse.success(await getSetupStatus()));
});

function setupItem(req: Request): SetupItemId {
  if (!env.SELF_HOSTED) throw new AppError("Not found", 404, "NOT_FOUND");
  const item = String(req.params.item) as SetupItemId;
  if (!SETUP_ITEMS.includes(item)) throw new AppError("Unknown setup step", 404, "NOT_FOUND");
  return item;
}

// "Keep the default" for an optional step, and its undo.
router.post("/setup/:item/skip", authenticate, requireAdmin, async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.success(await setSetupSkipped(setupItem(req), true, req.user!.id)));
});

router.delete("/setup/:item/skip", authenticate, requireAdmin, async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.success(await setSetupSkipped(setupItem(req), false, req.user!.id)));
});

export default router;
