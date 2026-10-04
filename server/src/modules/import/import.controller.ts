import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { isImportEnabled } from "../feature-flags/feature-flags.service";
import type { ImportInput, ListImportItemsQuery } from "./import.schema";
import { getImportBatch, listImportItems, runImport } from "./import.service";

export class ImportController {
  static async run(req: Request, res: Response) {
    const isEnabled = await isImportEnabled();
    if (!isEnabled) {
      return res.status(403).json(ApiResponse.error("IMPORT_DISABLED", "Import is currently disabled"));
    }

    const result = await runImport(req.user!.id, req.body as ImportInput);
    res.status(201).json(ApiResponse.success(result));
  }

  static async getBatch(req: Request, res: Response) {
    const batch = await getImportBatch(req.user!.id, req.params.batchId as string);
    res.status(200).json(ApiResponse.success(batch));
  }

  static async listItems(req: Request, res: Response) {
    const query = req.query as unknown as ListImportItemsQuery;
    const result = await listImportItems(req.user!.id, req.params.batchId as string, query);
    res.status(200).json(ApiResponse.success(result.items, { page: result.page, limit: result.limit, total: result.total }));
  }
}
