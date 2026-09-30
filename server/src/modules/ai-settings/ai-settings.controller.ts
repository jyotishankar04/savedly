import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import * as service from "./ai-settings.service";
import { getModelCatalog } from "./model-catalog";
import type { AiRole } from "../../db/enums";
import type { AssignRoleInput, CreateCredentialInput, TestConnectionInput, UpdateCredentialInput } from "./ai-settings.schema";

export class AiSettingsController {
  static async listCredentials(req: Request, res: Response) {
    const items = await service.listCredentials(req.user!.id);
    res.status(200).json(ApiResponse.success(items));
  }

  static async createCredential(req: Request, res: Response) {
    const credential = await service.createCredential(req.user!.id, req.body as CreateCredentialInput);
    res.status(201).json(ApiResponse.success(credential));
  }

  static async updateCredential(req: Request, res: Response) {
    const credential = await service.updateCredential(req.user!.id, req.params.id as string, req.body as UpdateCredentialInput);
    res.status(200).json(ApiResponse.success(credential));
  }

  static async deleteCredential(req: Request, res: Response) {
    await service.deleteCredential(req.user!.id, req.params.id as string);
    res.status(204).send();
  }

  static async listRoles(req: Request, res: Response) {
    const items = await service.listRoleAssignments(req.user!.id);
    res.status(200).json(ApiResponse.success(items));
  }

  static async assignRole(req: Request, res: Response) {
    const assignment = await service.assignRole(req.user!.id, req.params.role as AiRole, req.body as AssignRoleInput);
    res.status(200).json(ApiResponse.success(assignment));
  }

  static async unassignRole(req: Request, res: Response) {
    await service.unassignRole(req.user!.id, req.params.role as AiRole);
    res.status(204).send();
  }

  static async testConnection(req: Request, res: Response) {
    const result = await service.testConnection(req.body as TestConnectionInput);
    res.status(200).json(ApiResponse.success(result));
  }

  static async status(req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(await service.getAiStatus(req.user!.id)));
  }

  static async platformDefaults(_req: Request, res: Response) {
    res.status(200).json(ApiResponse.success(service.getPlatformDefaults()));
  }

  static async modelCatalog(_req: Request, res: Response) {
    const catalog = await getModelCatalog();
    res.setHeader("Cache-Control", "public, max-age=600");
    res.status(200).json(ApiResponse.success(catalog));
  }

  static async credentialModels(req: Request, res: Response) {
    const result = await service.listCredentialModels(req.user!.id, req.params.id as string);
    res.status(200).json(ApiResponse.success(result));
  }
}
