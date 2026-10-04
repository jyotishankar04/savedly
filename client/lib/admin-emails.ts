import { apiFetch, apiFetchRaw } from "@/lib/auth";

export type EmailCampaignCategory = "marketing" | "alert" | "announcement" | "custom";
export type EmailMessageStatus = "queued" | "sending" | "sent" | "failed";

export interface EmailCampaign {
  id: string;
  category: EmailCampaignCategory;
  subject: string;
  bodyText: string;
  recipientCount: number;
  createdAt: string;
  sent: number;
  failed: number;
  queued: number;
}

export interface EmailMessage {
  id: string;
  recipientEmail: string;
  status: EmailMessageStatus;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

export type EmailRecipients = { all: true } | { userIds: string[] };

export interface SendEmailInput {
  subject: string;
  body: string;
  category: EmailCampaignCategory;
  recipients: EmailRecipients;
}

export interface ListCampaignsResult {
  items: EmailCampaign[];
  page: number;
  limit: number;
  total: number;
}

export interface CampaignMessagesResult {
  items: EmailMessage[];
  page: number;
  limit: number;
  total: number;
  summary: { sent: number; failed: number; queued: number; sending: number };
}

export async function sendEmail(input: SendEmailInput): Promise<{ campaignId: string; recipientCount: number }> {
  return apiFetch<{ campaignId: string; recipientCount: number }>("/admin/emails/send", { method: "POST", body: input });
}

export async function listCampaigns(params: { page?: number; limit?: number } = {}): Promise<ListCampaignsResult> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const { data, meta } = await apiFetchRaw<EmailCampaign[]>(`/admin/emails${qs ? `?${qs}` : ""}`);
  return {
    items: data,
    page: (meta.page as number) ?? 1,
    limit: (meta.limit as number) ?? 20,
    total: (meta.total as number) ?? data.length,
  };
}

export async function getCampaignMessages(id: string, params: { page?: number; limit?: number } = {}): Promise<CampaignMessagesResult> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const { data, meta } = await apiFetchRaw<EmailMessage[]>(`/admin/emails/${id}/messages${qs ? `?${qs}` : ""}`);
  return {
    items: data,
    page: (meta.page as number) ?? 1,
    limit: (meta.limit as number) ?? 20,
    total: (meta.total as number) ?? data.length,
    summary: (meta.summary as CampaignMessagesResult["summary"]) ?? { sent: 0, failed: 0, queued: 0, sending: 0 },
  };
}
