import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { isBatchOperationsEnabled, getBatchMaxSize } from "../feature-flags/feature-flags.service";
import {
  batchTagMemories,
  batchMoveToCollection,
  batchDeleteMemories,
  batchRestoreMemories,
  batchUpdateMemoryStatus,
} from "./batch.service";
import type {
  BatchTagInput,
  BatchMoveToCollectionInput,
  BatchDeleteInput,
  BatchRestoreInput,
  BatchUpdateStatusInput,
} from "./batch.schema";

export class BatchController {
  static async tagMemories(req: Request, res: Response) {
    const isEnabled = await isBatchOperationsEnabled();
    if (!isEnabled) {
      return res.status(403).json(ApiResponse.error("BATCH_DISABLED", "Batch operations are currently disabled"));
    }

    const maxSize = await getBatchMaxSize();
    const input = req.body as BatchTagInput;
    if (input.memoryIds.length > maxSize) {
      return res.status(400).json(ApiResponse.error("BATCH_SIZE_EXCEEDED", `Batch size exceeds limit of ${maxSize}`));
    }

    const result = await batchTagMemories(req.user!.id, input);
    res.status(200).json(ApiResponse.success(result));
  }

  static async moveToCollection(req: Request, res: Response) {
    const isEnabled = await isBatchOperationsEnabled();
    if (!isEnabled) {
      return res.status(403).json(ApiResponse.error("BATCH_DISABLED", "Batch operations are currently disabled"));
    }

    const maxSize = await getBatchMaxSize();
    const input = req.body as BatchMoveToCollectionInput;
    if (input.memoryIds.length > maxSize) {
      return res.status(400).json(ApiResponse.error("BATCH_SIZE_EXCEEDED", `Batch size exceeds limit of ${maxSize}`));
    }

    const result = await batchMoveToCollection(req.user!.id, input);
    res.status(200).json(ApiResponse.success(result));
  }

  static async deleteMemories(req: Request, res: Response) {
    const isEnabled = await isBatchOperationsEnabled();
    if (!isEnabled) {
      return res.status(403).json(ApiResponse.error("BATCH_DISABLED", "Batch operations are currently disabled"));
    }

    const maxSize = await getBatchMaxSize();
    const input = req.body as BatchDeleteInput;
    if (input.memoryIds.length > maxSize) {
      return res.status(400).json(ApiResponse.error("BATCH_SIZE_EXCEEDED", `Batch size exceeds limit of ${maxSize}`));
    }

    const result = await batchDeleteMemories(req.user!.id, input);
    res.status(200).json(ApiResponse.success(result));
  }

  static async restoreMemories(req: Request, res: Response) {
    const isEnabled = await isBatchOperationsEnabled();
    if (!isEnabled) {
      return res.status(403).json(ApiResponse.error("BATCH_DISABLED", "Batch operations are currently disabled"));
    }

    const maxSize = await getBatchMaxSize();
    const input = req.body as BatchRestoreInput;
    if (input.memoryIds.length > maxSize) {
      return res.status(400).json(ApiResponse.error("BATCH_SIZE_EXCEEDED", `Batch size exceeds limit of ${maxSize}`));
    }

    const result = await batchRestoreMemories(req.user!.id, input);
    res.status(200).json(ApiResponse.success(result));
  }

  static async updateStatus(req: Request, res: Response) {
    const isEnabled = await isBatchOperationsEnabled();
    if (!isEnabled) {
      return res.status(403).json(ApiResponse.error("BATCH_DISABLED", "Batch operations are currently disabled"));
    }

    const maxSize = await getBatchMaxSize();
    const input = req.body as BatchUpdateStatusInput;
    if (input.memoryIds.length > maxSize) {
      return res.status(400).json(ApiResponse.error("BATCH_SIZE_EXCEEDED", `Batch size exceeds limit of ${maxSize}`));
    }

    const result = await batchUpdateMemoryStatus(req.user!.id, input);
    res.status(200).json(ApiResponse.success(result));
  }
}
