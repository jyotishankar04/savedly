import { Router, type NextFunction, type Request, type Response } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { requireFeature } from "../plans/api";
import { requireVaultUnlocked } from "../vault";
import { BatchController } from "./batch.controller";
import {
  validateBatchTag,
  validateBatchMove,
  validateBatchDelete,
  validateBatchRestore,
  validateBatchUpdateStatus,
  validateBatchUncollect,
  validateBatchRead,
  validateBatchRemind,
  validateBatchDeleteCollections,
  validateBatchMergeCollections,
  validateBatchVaultCollections,
} from "./batch.validator";

const router = Router();

// Batch operations for memories — all POST since they're state-changing.
// /api/v1/batch/memories/... A plan feature; every one-at-a-time action
// stays available on every plan.
const bulk = requireFeature("batchOperations");
router.post("/memories/tag", authenticate, bulk, validateBatchTag, BatchController.tagMemories);
router.post("/memories/move", authenticate, bulk, validateBatchMove, BatchController.moveToCollection);
router.post("/memories/delete", authenticate, bulk, validateBatchDelete, BatchController.deleteMemories);
router.post("/memories/restore", authenticate, bulk, validateBatchRestore, BatchController.restoreMemories);
// Taking things out of the vault needs it unlocked, as it does one at a time
// (requireUnlockToUnvault on the single routes); putting them in doesn't.
const unlockedToUnvault = (field: "vaulted" | "isVaulted") => (req: Request, res: Response, next: NextFunction) =>
  req.body?.[field] === false ? requireVaultUnlocked(req, res, next) : next();

router.post("/memories/status", authenticate, bulk, validateBatchUpdateStatus, unlockedToUnvault("vaulted"), BatchController.updateStatus);
router.post("/memories/uncollect", authenticate, bulk, validateBatchUncollect, BatchController.uncollectMemories);
router.post("/memories/read", authenticate, bulk, validateBatchRead, BatchController.readMemories);
router.post("/memories/remind", authenticate, bulk, validateBatchRemind, BatchController.remindMemories);

// /api/v1/batch/collections/...
router.post("/collections/delete", authenticate, bulk, validateBatchDeleteCollections, BatchController.deleteCollections);
router.post("/collections/merge", authenticate, bulk, validateBatchMergeCollections, BatchController.mergeCollections);
router.post("/collections/vault", authenticate, bulk, validateBatchVaultCollections, unlockedToUnvault("isVaulted"), BatchController.vaultCollections);

export default router;
