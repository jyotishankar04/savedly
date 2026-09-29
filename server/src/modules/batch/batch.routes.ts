import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { requireFeature } from "../plans/require-feature";
import { BatchController } from "./batch.controller";
import {
  validateBatchTag,
  validateBatchMove,
  validateBatchDelete,
  validateBatchRestore,
  validateBatchUpdateStatus,
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
router.post("/memories/status", authenticate, bulk, validateBatchUpdateStatus, BatchController.updateStatus);

export default router;
