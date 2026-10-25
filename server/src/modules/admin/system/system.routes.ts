import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireAdmin } from "../../../shared/middlewares/require-admin";
import { ApiResponse } from "../../../shared/response/api-response";
import { AppError } from "../../../shared/errors/app-error";
import { env } from "../../../config/env";
import { getSystemStatus } from "./system.service";
import { createBackup } from "./backup.service";
import { getUpdateStatus } from "./update.service";
import { logAdminAction } from "../../../shared/utils/audit-log";
import { SETUP_ITEMS, getSetupStatus, setSetupSkipped, type SetupItemId } from "./setup.service";

// Mounted at /admin/system. Self-hosted only; the hosted service has its own monitoring.
const router = Router();

router.get("/", authenticate, requireAdmin, async (_req: Request, res: Response) => {
  if (!env.SELF_HOSTED) throw new AppError("Not found", 404, "NOT_FOUND");
  res.status(200).json(ApiResponse.success(await getSystemStatus()));
});

// Never fails the page: if GitHub is unreachable, no update is mentioned.
router.get("/update", authenticate, requireAdmin, async (_req: Request, res: Response) => {
  if (!env.SELF_HOSTED) throw new AppError("Not found", 404, "NOT_FOUND");
  res.status(200).json(ApiResponse.success(await getUpdateStatus()));
});

// A GET so the browser streams it to disk. `?key=1` adds the secrets file, so keep that archive private.
router.get("/backup", authenticate, requireAdmin, async (req: Request, res: Response) => {
  if (!env.SELF_HOSTED) throw new AppError("Not found", 404, "NOT_FOUND");
  const includeKey = req.query.key === "1";
  const backup = await createBackup({ includeKey });
  await logAdminAction({ adminUserId: req.user!.id, action: "system.backup.downloaded", targetType: "system", targetId: "backup", afterValue: { includeKey } });

  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", `attachment; filename="${backup.filename}"`);
  res.setHeader("Cache-Control", "no-store");
  // However the download ends, the temp folder is removed.
  let cleaned = false;
  const finish = () => {
    if (cleaned) return;
    cleaned = true;
    void backup.cleanup();
  };
  res.on("close", finish);
  backup.stream.on("error", () => {
    finish();
    res.destroy();
  });
  backup.stream.pipe(res);
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
