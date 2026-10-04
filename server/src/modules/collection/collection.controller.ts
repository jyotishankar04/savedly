import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import type { ListCollectionsQuery } from "./collection.schema";
import {
  convertToUser,
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from "./collection.service";

export class CollectionController {
  static async list(req: Request, res: Response) {
    const query = req.query as unknown as ListCollectionsQuery;
    const collections = await listCollections(req.user!.id, query);
    res.status(200).json(ApiResponse.success(collections));
  }

  static async create(req: Request, res: Response) {
    const collection = await createCollection(req.user!.id, req.body);
    res.status(201).json(ApiResponse.success(collection));
  }

  static async update(req: Request, res: Response) {
    const collection = await updateCollection(req.user!.id, req.params.id as string, req.body);
    res.status(200).json(ApiResponse.success(collection));
  }

  static async convertToUser(req: Request, res: Response) {
    const collection = await convertToUser(req.user!.id, req.params.id as string);
    res.status(200).json(ApiResponse.success(collection));
  }

  static async remove(req: Request, res: Response) {
    await deleteCollection(req.user!.id, req.params.id as string);
    res.status(204).send();
  }
}
