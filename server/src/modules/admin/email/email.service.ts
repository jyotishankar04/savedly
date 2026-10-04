import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../db";
import { emailCampaigns, emailMessages } from "../../../db/schema";
import { EmailStatus } from "../../../db/enums";
import { AppError } from "../../../shared/errors/app-error";
import { sendBulkEmail } from "../../email";
import type { ListCampaignMessagesQuery, ListCampaignsQuery, SendEmailInput } from "./email.schema";

export async function sendAdminEmail(input: SendEmailInput, adminUserId: string) {
  return sendBulkEmail({
    subject: input.subject,
    bodyText: input.body,
    category: input.category,
    recipients: input.recipients,
    createdBy: adminUserId,
  });
}

export async function listCampaigns(query: ListCampaignsQuery) {
  const [{ value: total }] = await db.select({ value: count() }).from(emailCampaigns);

  const items = await db
    .select()
    .from(emailCampaigns)
    .orderBy(desc(emailCampaigns.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  if (items.length === 0) {
    return { items: [], page: query.page, limit: query.limit, total };
  }

  const campaignIds = items.map((c) => c.id);
  const statusCounts = await db
    .select({ campaignId: emailMessages.campaignId, status: emailMessages.status, value: count() })
    .from(emailMessages)
    .where(inArray(emailMessages.campaignId, campaignIds))
    .groupBy(emailMessages.campaignId, emailMessages.status);

  const countsByCampaign = new Map<string, { sent: number; failed: number; queued: number }>();
  for (const row of statusCounts) {
    if (!row.campaignId) continue;
    const bucket = countsByCampaign.get(row.campaignId) ?? { sent: 0, failed: 0, queued: 0 };
    if (row.status === EmailStatus.SENT) bucket.sent += row.value;
    else if (row.status === EmailStatus.FAILED) bucket.failed += row.value;
    else bucket.queued += row.value; // queued + sending both read as "in flight"
    countsByCampaign.set(row.campaignId, bucket);
  }

  const enriched = items.map((c) => ({
    ...c,
    ...(countsByCampaign.get(c.id) ?? { sent: 0, failed: 0, queued: 0 }),
  }));

  return { items: enriched, page: query.page, limit: query.limit, total };
}

export async function getCampaignMessages(campaignId: string, query: ListCampaignMessagesQuery) {
  const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId)).limit(1);
  if (!campaign) {
    throw new AppError("Campaign not found", 404, "NOT_FOUND");
  }

  const statusFilter = query.status
    ? and(eq(emailMessages.campaignId, campaignId), eq(emailMessages.status, query.status))
    : eq(emailMessages.campaignId, campaignId);

  const [{ value: total }] = await db.select({ value: count() }).from(emailMessages).where(statusFilter);

  const items = await db
    .select({
      id: emailMessages.id,
      recipientEmail: emailMessages.recipientEmail,
      status: emailMessages.status,
      error: emailMessages.error,
      sentAt: emailMessages.sentAt,
      createdAt: emailMessages.createdAt,
    })
    .from(emailMessages)
    .where(statusFilter)
    .orderBy(desc(emailMessages.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  const summaryRows = await db
    .select({ status: emailMessages.status, value: count() })
    .from(emailMessages)
    .where(eq(emailMessages.campaignId, campaignId))
    .groupBy(emailMessages.status);

  const summary = { sent: 0, failed: 0, queued: 0, sending: 0 };
  for (const row of summaryRows) {
    if (row.status === EmailStatus.SENT) summary.sent = row.value;
    else if (row.status === EmailStatus.FAILED) summary.failed = row.value;
    else if (row.status === EmailStatus.SENDING) summary.sending = row.value;
    else summary.queued = row.value;
  }

  return { campaign, items, page: query.page, limit: query.limit, total, summary };
}
