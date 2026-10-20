import { z } from "zod";
import { ContactMessageStatus, ReportStatus, ReportType } from "../../db/enums";

const page = z.coerce.number().int().min(1).max(1000).default(1);
const q = z.string().trim().max(200).optional();

export const listContactSchema = z.object({
  status: z.enum([ContactMessageStatus.NEW, ContactMessageStatus.READ, ContactMessageStatus.REPLIED, ContactMessageStatus.ARCHIVED]).optional(),
  q,
  page,
});

export const listReportsSchema = z.object({
  status: z.enum([ReportStatus.OPEN, ReportStatus.REVIEWING, ReportStatus.RESOLVED, ReportStatus.DECLINED]).optional(),
  type: z.enum([ReportType.BUG, ReportType.FEATURE]).optional(),
  q,
  page,
});

export const updateContactSchema = z.object({
  status: z.enum([ContactMessageStatus.NEW, ContactMessageStatus.READ, ContactMessageStatus.REPLIED, ContactMessageStatus.ARCHIVED]),
});

export const updateReportSchema = z.object({
  status: z.enum([ReportStatus.OPEN, ReportStatus.REVIEWING, ReportStatus.RESOLVED, ReportStatus.DECLINED]),
});

export const idParamsSchema = z.object({ id: z.string().uuid() });

export type ListContactQuery = z.infer<typeof listContactSchema>;
export type ListReportsQuery = z.infer<typeof listReportsSchema>;
