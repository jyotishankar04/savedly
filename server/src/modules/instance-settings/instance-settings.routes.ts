import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { requireAdmin } from "../../shared/middlewares/require-admin";
import { InstanceSettingsController } from "./instance-settings.controller";

// Mounted at /admin/instance-settings. Readable everywhere (hosted shows "Set by environment");
// saving needs SELF_HOSTED or a hostedEditable section (saveSection).
const router = Router();

router.get("/", authenticate, requireAdmin, InstanceSettingsController.list);
// Re-index memories for search by meaning (before /:section so it isn't taken as one).
router.get("/embeddings/reindex", authenticate, requireAdmin, InstanceSettingsController.reindexStatus);
router.post("/embeddings/reindex", authenticate, requireAdmin, InstanceSettingsController.reindex);
router.put("/:section", authenticate, requireAdmin, InstanceSettingsController.update);
router.post("/:section/test", authenticate, requireAdmin, InstanceSettingsController.test);

export default router;
