import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { emailCampaigns, emailMessages, users } from "../../db/schema";
import { EmailCategory, EmailTemplateKey, UserStatus } from "../../db/enums";
import { logAdminAction } from "../../shared/utils/audit-log";
import { adminComposedEmailTemplate } from "../../shared/mailer/templates";
import { enqueueEmail } from "./email.queue";

export interface SendEmailInput {
  to: string;
  recipientUserId?: string | null;
  category: EmailCategory;
  templateKey: EmailTemplateKey;
  subject: string;
  html: string;
}

/**
 * The single write path — every email in the system, system-triggered or
 * admin-composed, funnels through here. Inserts one email_messages row
 * (the durable source of truth) then enqueues one job; mirrors
 * createNotification's "one function everything funnels through" shape.
 */
export async function sendEmail(input: SendEmailInput): Promise<string> {
  const [row] = await db
    .insert(emailMessages)
    .values({
      recipientUserId: input.recipientUserId ?? null,
      recipientEmail: input.to,
      category: input.category,
      templateKey: input.templateKey,
      subject: input.subject,
      bodyHtml: input.html,
    })
    .returning({ id: emailMessages.id });

  await enqueueEmail(row.id);
  return row.id;
}

export type BulkEmailRecipients = { all: true } | { userIds: string[] };

export interface SendBulkEmailInput {
  subject: string;
  bodyText: string;
  category: EmailCategory;
  recipients: BulkEmailRecipients;
  createdBy: string;
  /** Set when this originates outside the admin composer (e.g. an announcement's opt-in checkbox) so the audit log still records who triggered it and why. */
  auditAction?: string;
}

/**
 * Creates one campaign row + N message rows + N queue jobs — one job per
 * recipient so a single bad address never blocks the rest. Also writes the
 * admin audit log entry here (not in the admin controller layer) so every
 * caller — the manual composer and the announcement opt-in — gets it for
 * free without double-logging.
 */
export async function sendBulkEmail(input: SendBulkEmailInput): Promise<{ campaignId: string; recipientCount: number }> {
  const recipients =
    "all" in input.recipients
      ? await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.status, UserStatus.ACTIVE))
      : await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, input.recipients.userIds));

  const { html } = adminComposedEmailTemplate({ subject: input.subject, bodyText: input.bodyText });

  const result = await db.transaction(async (tx) => {
    const [campaign] = await tx
      .insert(emailCampaigns)
      .values({
        category: input.category,
        subject: input.subject,
        bodyText: input.bodyText,
        recipientFilter: input.recipients,
        recipientCount: recipients.length,
        createdBy: input.createdBy,
      })
      .returning();

    if (recipients.length > 0) {
      const rows = recipients.map((r) => ({
        campaignId: campaign.id,
        recipientUserId: r.id,
        recipientEmail: r.email,
        category: input.category,
        templateKey: EmailTemplateKey.ADMIN_CUSTOM,
        subject: input.subject,
        bodyHtml: html,
      }));
      const inserted = await tx.insert(emailMessages).values(rows).returning({ id: emailMessages.id });
      return { campaignId: campaign.id, messageIds: inserted.map((m) => m.id) };
    }

    return { campaignId: campaign.id, messageIds: [] as string[] };
  });

  // Enqueued after the transaction commits — a worker picking up a job
  // whose row doesn't exist yet (impossible here, but a defensive habit)
  // just no-ops per its own guard.
  await Promise.all(result.messageIds.map((id) => enqueueEmail(id)));

  await logAdminAction({
    adminUserId: input.createdBy,
    action: input.auditAction ?? "email.campaign.sent",
    targetType: "email_campaign",
    targetId: result.campaignId,
    afterValue: { subject: input.subject, category: input.category, recipientCount: recipients.length },
  });

  return { campaignId: result.campaignId, recipientCount: recipients.length };
}
