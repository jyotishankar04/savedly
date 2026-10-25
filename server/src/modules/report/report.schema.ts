import { z } from "zod";
import { ReportType } from "../../db/enums";

export const createReportSchema = z.object({
  type: z.enum([ReportType.BUG, ReportType.FEATURE]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  email: z.string().email().max(255).optional(),
  // Where the submitter was (page path or URL); only length-capped, as it's diagnostic text, not a
  // followed link.
  pageUrl: z.string().max(2000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
