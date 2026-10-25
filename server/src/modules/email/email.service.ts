import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { emailCampaigns, emailMessages, userSettings, users } from "../../db/schema";
import { EmailCategory, EmailTemplateKey, UserStatus } from "../../db/enums";
import { logAdminAction } from "../../shared/utils/audit-log";
import { adminComposedEmailTemplate, composedEmailTemplate, composedEmailToText, withUnsubscribeUrl, type ComposedEmail } from "../../platform/mailer/templates";
import { unsubscribePageUrl } from "../../platform/mailer/unsubscribe";
import { enqueueEmail } from "./email.queue";

export interface SendEmailInput {
  to: string;
  recipientUserId?: string | null;
  category: EmailCategory;
  templateKey: EmailTemplateKey;
  subject: string;
  html: string;
}

/** The single write path for every email: inserts one email_messages row and enqueues one job. */
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
  /** Plain text. Ignored when `content` is given. */
  bodyText?: string;
  /** What the admin composer built. Takes the place of `bodyText`. */
  content?: ComposedEmail;
  category: EmailCategory;
  recipients: BulkEmailRecipients;
  createdBy: string;
  /**
   * Set when this isn't from the admin composer (e.g. an announcement's opt-in), so the audit log
   * records who and why.
   */
  auditAction?: string;
}

/**
 * One campaign row, N message rows, N jobs (a bad address blocks nothing). The audit entry is
 * written here so every caller gets it once.
 */
export async function sendBulkEmail(input: SendBulkEmailInput): Promise<{ campaignId: string; recipientCount: number; unsubscribedCount: number }> {
  // People who unsubscribed are left out, whoever was picked.
  const chosen = "all" in input.recipients ? eq(users.status, UserStatus.ACTIVE) : inArray(users.id, input.recipients.userIds);
  const everyone = await db
    .select({ id: users.id, email: users.email, unsubscribedAt: userSettings.emailUnsubscribedAt })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(chosen);
  const recipients = everyone.filter((r) => r.unsubscribedAt === null);
  const unsubscribedCount = everyone.length - recipients.length;

  // The campaign keeps a plain-text copy either way, for the admin list.
  const bodyText = input.content ? composedEmailToText(input.content) : (input.bodyText ?? "");
  const { html } = input.content
    ? composedEmailTemplate({ subject: input.subject, content: input.content })
    : adminComposedEmailTemplate({ subject: input.subject, bodyText });

  const result = await db.transaction(async (tx) => {
    const [campaign] = await tx
      .insert(emailCampaigns)
      .values({
        category: input.category,
        subject: input.subject,
        bodyText,
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
        bodyHtml: withUnsubscribeUrl(html, unsubscribePageUrl(r.id)),
      }));
      const inserted = await tx.insert(emailMessages).values(rows).returning({ id: emailMessages.id });
      return { campaignId: campaign.id, messageIds: inserted.map((m) => m.id) };
    }

    return { campaignId: campaign.id, messageIds: [] as string[] };
  });

  // Enqueued after commit, so a worker never sees a missing row (it no-ops per its own guard anyway).
  await Promise.all(result.messageIds.map((id) => enqueueEmail(id)));

  await logAdminAction({
    adminUserId: input.createdBy,
    action: input.auditAction ?? "email.campaign.sent",
    targetType: "email_campaign",
    targetId: result.campaignId,
    afterValue: { subject: input.subject, category: input.category, recipientCount: recipients.length, unsubscribedCount },
  });

  return { campaignId: result.campaignId, recipientCount: recipients.length, unsubscribedCount };
}
