import { z } from "zod";
import { ContactMessageStatus, ReportStatus, ReportType } from "../../db/enums";

const page = z.coerce.number().int().min(1).max(1000).default(1);
const q = z.string().trim().max(200).optional();

/** "new,read" -> ["new", "read"]: a folder can be more than one status. */
const statusList = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .string()
    .optional()
    .transform((text) => (text ? text.split(",").map((part) => part.trim()).filter(Boolean) : []))
    .pipe(z.array(z.enum(values)));

export const listContactSchema = z.object({
  statuses: statusList([ContactMessageStatus.NEW, ContactMessageStatus.READ, ContactMessageStatus.REPLIED, ContactMessageStatus.ARCHIVED]),
  q,
  page,
});

export const listReportsSchema = z.object({
  statuses: statusList([ReportStatus.OPEN, ReportStatus.REVIEWING, ReportStatus.RESOLVED, ReportStatus.DECLINED]),
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

export const kindIdParamsSchema = z.object({ kind: z.enum(["contact", "report"]), id: z.string().uuid() });

export const replySchema = z.object({ body: z.string().trim().min(1).max(10000) });

export type ListContactQuery = z.infer<typeof listContactSchema>;
export type ListReportsQuery = z.infer<typeof listReportsSchema>;
