import { Router } from "express";
import type { Request, Response } from "express";
import { env } from "../../config/env";
import { ApiResponse } from "../../shared/response/api-response";
import { isBillingEnabled } from "../billing";

// Mounted at /config by ../../routes/index.ts. Public, unauthenticated: lets
// the client decide at runtime (not build time) whether it's talking to a
// self-hosted install, so one client image works for both.
const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.status(200).json(ApiResponse.success({ selfHosted: env.SELF_HOSTED, billing: isBillingEnabled() }));
});

export default router;
