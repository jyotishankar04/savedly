import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { logAdminAction } from "../../shared/utils/audit-log";
import {
  addRoadmapVote,
  createRoadmapItem,
  deleteRoadmapItem,
  listRoadmapItems,
  publicRoadmap,
  removeRoadmapVote,
  reorderRoadmap,
  roadmapVotesFor,
  updateRoadmapItem,
} from "./roadmap.service";

export class RoadmapController {
  static async roadmap(_req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await publicRoadmap()));
  }

  static async votes(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await roadmapVotesFor(req.user?.id ?? null)));
  }

  static async vote(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await addRoadmapVote(req.params.slug as string, req.user!.id)));
  }

  static async unvote(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await removeRoadmapVote(req.params.slug as string, req.user!.id)));
  }

  static async list(_req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await listRoadmapItems()));
  }

  static async create(req: Request, res: Response) {
    const row = await createRoadmapItem(req.body);
    await logAdminAction({ adminUserId: req.user!.id, action: "roadmap.created", targetType: "roadmap_item", targetId: row.id, afterValue: row, ipAddress: req.ip });
    res.status(201).json(ApiResponse.success(row));
  }

  static async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const { before, after } = await updateRoadmapItem(id, req.body);
    await logAdminAction({ adminUserId: req.user!.id, action: "roadmap.updated", targetType: "roadmap_item", targetId: id, beforeValue: before, afterValue: after, ipAddress: req.ip });
    res.status(200).json(ApiResponse.success(after));
  }

  static async reorder(req: Request, res: Response) {
    const items = await reorderRoadmap(req.body);
    await logAdminAction({ adminUserId: req.user!.id, action: "roadmap.reordered", targetType: "roadmap_item", afterValue: req.body, ipAddress: req.ip });
    res.status(200).json(ApiResponse.success(items));
  }

  static async remove(req: Request, res: Response) {
    const row = await deleteRoadmapItem(req.params.id as string);
    await logAdminAction({ adminUserId: req.user!.id, action: "roadmap.deleted", targetType: "roadmap_item", targetId: row.id, beforeValue: row, ipAddress: req.ip });
    res.status(200).json(ApiResponse.success(row));
  }
}
