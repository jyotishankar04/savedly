import { z } from "zod";
import { EmailCategory, EmailStatus } from "../../../db/enums";

// A button's link: a path inside the site ("/app/capture") or a full http(s)
// address. Nothing else, so a composed email can't carry a javascript: or
// data: link.
const linkSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), "Use a path starting with / or a full https:// address");

const toneSchema = z.enum(["primary", "success", "warning", "danger", "neutral"]);

const emailBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().trim().min(1).max(4000) }),
  z.object({ type: z.literal("bullets"), items: z.array(z.string().trim().min(1).max(300)).min(1).max(12) }),
  z.object({ type: z.literal("button"), label: z.string().trim().min(1).max(60), url: linkSchema }),
  z.object({ type: z.literal("note"), text: z.string().trim().min(1).max(1000), tone: toneSchema.optional() }),
  z.object({ type: z.literal("image"), url: z.string().trim().url().max(1000).refine((v) => /^https?:\/\//i.test(v), "Use an https:// image address"), alt: z.string().trim().max(200).optional() }),
  z.object({ type: z.literal("divider") }),
]);

/** What the admin composer builds. See ComposedEmail in shared/mailer/templates.ts. */
export const emailContentSchema = z.object({
  label: z.string().trim().max(40).optional(),
  tone: toneSchema.optional(),
  headline: z.string().trim().max(140).optional(),
  blocks: z.array(emailBlockSchema).min(1).max(20),
});

export const sendEmailSchema = z
  .object({
    subject: z.string().trim().min(1).max(255),
    // Either the composer's blocks, or (older callers) plain text.
    content: emailContentSchema.optional(),
    body: z.string().min(1).optional(),
    category: z.enum([EmailCategory.MARKETING, EmailCategory.ALERT, EmailCategory.ANNOUNCEMENT, EmailCategory.CUSTOM]),
    recipients: z.union([
      z.object({ all: z.literal(true) }),
      z.object({ userIds: z.array(z.string().uuid()).min(1).max(5000) }),
    ]),
  })
  .refine((data) => data.content || data.body, { message: "Write something to send", path: ["content"] });

/** Preview and "send me a test": the same email, with no recipients to choose. */
export const previewEmailSchema = z.object({
  subject: z.string().trim().max(255).default(""),
  content: emailContentSchema,
});

export const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listCampaignMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([EmailStatus.QUEUED, EmailStatus.SENDING, EmailStatus.SENT, EmailStatus.FAILED]).optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type PreviewEmailInput = z.infer<typeof previewEmailSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
export type ListCampaignMessagesQuery = z.infer<typeof listCampaignMessagesQuerySchema>;
