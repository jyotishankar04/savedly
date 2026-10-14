import { db } from "../../db";
import { reports } from "../../db/schema";
import { getSection } from "../instance-settings/instance-settings.service";
import { isEmailEnabled, sendMail } from "../../shared/mailer/mailer";
import { logger } from "../../shared/utils/logger";
import type { CreateReportInput } from "./report.schema";

export interface CreateReportResult {
  id: string;
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Emails a new report to the contact address (Admin > Infrastructure >
 * Email), the same inbox the contact form uses, so someone actually reads
 * it. Best effort: the report is already saved, so a failed or switched-off
 * email is logged and the person filing it still sees it go through.
 */
async function notifyTeam(id: string, input: CreateReportInput): Promise<void> {
  try {
    const settings = (await getSection("email")) as { contactAddress?: string };
    if (!(await isEmailEnabled()) || !settings.contactAddress) return;
    const kind = input.type === "bug" ? "Bug" : "Idea";
    await sendMail({
      to: settings.contactAddress,
      replyTo: input.email || undefined,
      subject: `[Report] ${kind}: ${input.title.replace(/[\r\n]/g, " ")}`,
      html: [
        `<p><strong>${kind}</strong>: ${escape(input.title)}</p>`,
        `<p>${escape(input.description).replace(/\r?\n/g, "<br>")}</p>`,
        `<p style="color:#666">From ${input.email ? escape(input.email) : "someone who left no email"}${input.pageUrl ? `, on ${escape(input.pageUrl)}` : ""}. Report ${id}.</p>`,
      ].join(""),
    });
  } catch (err) {
    logger.error({ reportId: id, err }, "[report] email to the team failed");
  }
}

export async function createReport(input: CreateReportInput, userId: string | null): Promise<CreateReportResult> {
  const [row] = await db
    .insert(reports)
    .values({
      type: input.type,
      title: input.title,
      description: input.description,
      email: input.email ?? null,
      pageUrl: input.pageUrl ?? null,
      userId,
    })
    .returning({ id: reports.id });

  void notifyTeam(row.id, input);
  return { id: row.id };
}
