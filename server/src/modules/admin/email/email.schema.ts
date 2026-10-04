import { z } from "zod";
import { EmailCategory, EmailStatus } from "../../../db/enums";

export const sendEmailSchema = z.object({
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
  category: z.enum([EmailCategory.MARKETING, EmailCategory.ALERT, EmailCategory.ANNOUNCEMENT, EmailCategory.CUSTOM]),
  recipients: z.union([
    z.object({ all: z.literal(true) }),
    z.object({ userIds: z.array(z.string().uuid()).min(1).max(5000) }),
  ]),
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
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
export type ListCampaignMessagesQuery = z.infer<typeof listCampaignMessagesQuerySchema>;
