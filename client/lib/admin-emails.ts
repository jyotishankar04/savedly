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

export type EmailTone = "primary" | "success" | "warning" | "danger" | "neutral";

/** One piece of a composed email. Mirrors EmailBlock in the server's mailer templates. */
export type EmailBlock =
  | { type: "text"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "button"; label: string; url: string }
  | { type: "note"; text: string; tone?: EmailTone }
  | { type: "image"; url: string; alt?: string }
  | { type: "divider" };

export interface EmailContent {
  label?: string;
  tone?: EmailTone;
  headline?: string;
  blocks: EmailBlock[];
}

export interface SendEmailInput {
  subject: string;
  content: EmailContent;
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

export interface SendEmailResult {
  campaignId: string;
  recipientCount: number;
  /** People who were picked but have unsubscribed, so were left out. */
  unsubscribedCount: number;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  return apiFetch<SendEmailResult>("/admin/emails/send", { method: "POST", body: input });
}

/** The exact HTML the server would send for this email. */
export async function previewEmail(input: { subject: string; content: EmailContent }): Promise<{ html: string }> {
  return apiFetch<{ html: string }>("/admin/emails/preview", { method: "POST", body: input });
}

/** Sends the email to the signed-in admin's own address only. */
export async function sendTestEmail(input: { subject: string; content: EmailContent }): Promise<{ to: string }> {
  return apiFetch<{ to: string }>("/admin/emails/test", { method: "POST", body: input });
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
