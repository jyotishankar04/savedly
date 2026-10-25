import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { isBatchOperationsEnabled, getBatchMaxSize } from "../feature-flags/api";
import {
  batchTagMemories,
  batchMoveToCollection,
  batchDeleteMemories,
  batchRestoreMemories,
  batchUpdateMemoryStatus,
  batchUncollectMemories,
  batchSetRead,
  batchSetReminder,
  batchDeleteCollections,
  batchMergeCollections,
  batchVaultCollections,
} from "./batch.service";
import type { BatchResult } from "./batch.schema";

/**
 * Every batch endpoint: refused while an admin has bulk actions switched off,
 * or when the batch is larger than the admin's limit; otherwise `run` on the
 * signed-in user's ids and send its BatchResult.
 */
function batchHandler<T>(ids: (input: T) => string[], run: (userId: string, input: T) => Promise<BatchResult>) {
  return async (req: Request, res: Response) => {
    if (!(await isBatchOperationsEnabled())) {
      return res.status(403).json(ApiResponse.error("BATCH_DISABLED", "Batch operations are currently disabled"));
    }
    const input = req.body as T;
    const maxSize = await getBatchMaxSize();
    if (ids(input).length > maxSize) {
      return res.status(400).json(ApiResponse.error("BATCH_SIZE_EXCEEDED", `Batch size exceeds limit of ${maxSize}`));
    }
    const result = await run(req.user!.id, input);
    res.status(200).json(ApiResponse.success(result));
  };
}

const memoryIds = (input: { memoryIds: string[] }) => input.memoryIds;
const collectionIds = (input: { collectionIds: string[] }) => input.collectionIds;

export class BatchController {
  static tagMemories = batchHandler(memoryIds, batchTagMemories);
  static moveToCollection = batchHandler(memoryIds, batchMoveToCollection);
  static deleteMemories = batchHandler(memoryIds, batchDeleteMemories);
  static restoreMemories = batchHandler(memoryIds, batchRestoreMemories);
  static updateStatus = batchHandler(memoryIds, batchUpdateMemoryStatus);
  static uncollectMemories = batchHandler(memoryIds, batchUncollectMemories);
  static readMemories = batchHandler(memoryIds, batchSetRead);
  static remindMemories = batchHandler(memoryIds, batchSetReminder);
  static deleteCollections = batchHandler(collectionIds, batchDeleteCollections);
  static mergeCollections = batchHandler(collectionIds, batchMergeCollections);
  static vaultCollections = batchHandler(collectionIds, batchVaultCollections);
}
