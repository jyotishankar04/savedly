import { z } from "zod";
import { ReportType } from "../../db/enums";

export const createReportSchema = z.object({
  type: z.enum([ReportType.BUG, ReportType.FEATURE]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  email: z.string().email().max(255).optional(),
  // Where the submitter was: a page path or full URL. Only length-capped, since it's diagnostic
  // text, not a link anyone follows.
  pageUrl: z.string().max(2000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
