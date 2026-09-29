import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireAdmin } from "../../../shared/middlewares/require-admin";
import { ApiResponse } from "../../../shared/response/api-response";
import { AppError } from "../../../shared/errors/app-error";
import { env } from "../../../config/env";
import { getSystemStatus } from "./system.service";

// Mounted at /admin/system by ../index.ts. Self-hosted installs only — the
// hosted service has its own monitoring.
const router = Router();

router.get("/", authenticate, requireAdmin, async (_req: Request, res: Response) => {
  if (!env.SELF_HOSTED) throw new AppError("Not found", 404, "NOT_FOUND");
  res.status(200).json(ApiResponse.success(await getSystemStatus()));
});

export default router;
