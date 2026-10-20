import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { createHighlight, deleteHighlight, highlightedUrlKeys, listForMemory, pageHighlights, updateHighlight } from "./highlight.service";
import type { CreateHighlightInput, UpdateHighlightInput } from "./highlight.schema";

export class HighlightController {
  static async create(req: Request, res: Response) {
    res.status(201).json(ApiResponse.success(await createHighlight(req.user!.id, req.body as CreateHighlightInput)));
  }

  static async update(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await updateHighlight(req.user!.id, req.params.id as string, req.body as UpdateHighlightInput)));
  }

  static async remove(req: Request, res: Response) {
    await deleteHighlight(req.user!.id, req.params.id as string);
    res.status(204).send();
  }

  static async page(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await pageHighlights(req.user!.id, req.query.url as string)));
  }

  static async urlKeys(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success({ keys: await highlightedUrlKeys(req.user!.id) }));
  }

  static async forMemory(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await listForMemory(req.user!.id, req.params.id as string)));
  }
}
