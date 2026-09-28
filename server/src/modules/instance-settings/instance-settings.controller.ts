import type { Request, Response } from "express";
import { env } from "../../config/env";
import { ApiResponse } from "../../shared/response/api-response";
import { AppError } from "../../shared/errors/app-error";
import { logAdminAction } from "../../shared/utils/audit-log";
import { getSectionDef, type SectionId } from "./instance-settings.registry";
import { describeSections, mergeCandidate, saveSection } from "./instance-settings.service";
import { testSection } from "./instance-settings.tester";

function sectionParam(req: Request): SectionId {
  const id = req.params.section as string;
  if (!getSectionDef(id)) throw new AppError("Unknown settings section", 404, "NOT_FOUND");
  return id as SectionId;
}

export class InstanceSettingsController {
  static async list(_req: Request, res: Response) {
    const sections = await describeSections();
    res.status(200).json(
      ApiResponse.success({
        selfHosted: env.SELF_HOSTED,
        // Shown next to the OAuth sections so the admin can paste them into
        // Google Cloud Console / GitHub.
        callbackUrls: {
          google: `${env.SERVER_URL}/api/v1/auth/google/callback`,
          github: `${env.SERVER_URL}/api/v1/auth/github/callback`,
        },
        sections,
      }),
    );
  }

  static async update(req: Request, res: Response) {
    const id = sectionParam(req);
    const { after } = await saveSection(id, req.body ?? {}, req.user!.id);

    // Only the section and which fields changed — never the values, since
    // some of them are secrets.
    await logAdminAction({
      adminUserId: req.user!.id,
      action: "instance_settings.updated",
      targetType: "instance_settings",
      targetId: id,
      beforeValue: null,
      afterValue: after,
      ipAddress: req.ip,
    });

    res.status(200).json(ApiResponse.success((await describeSections()).find((s) => s.id === id)));
  }

  static async test(req: Request, res: Response) {
    const id = sectionParam(req);
    const { merged } = await mergeCandidate(id, req.body ?? {});
    try {
      const message = await testSection(id, merged);
      res.status(200).json(ApiResponse.success({ ok: true, message }));
    } catch (err) {
      res.status(200).json(ApiResponse.success({ ok: false, message: err instanceof Error ? err.message : String(err) }));
    }
  }
}
