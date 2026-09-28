import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { requireAdmin } from "../../shared/middlewares/require-admin";
import { InstanceSettingsController } from "./instance-settings.controller";

// Mounted at /admin/instance-settings by ../../routes/index.ts. The list is
// readable on any install (hosted production shows every field as "Set by
// environment"); saving is refused unless SELF_HOSTED — see saveSection.
const router = Router();

router.get("/", authenticate, requireAdmin, InstanceSettingsController.list);
router.put("/:section", authenticate, requireAdmin, InstanceSettingsController.update);
router.post("/:section/test", authenticate, requireAdmin, InstanceSettingsController.test);

export default router;
