import { z } from "zod";
import { ReportType } from "../../db/enums";

export const createReportSchema = z.object({
  type: z.enum([ReportType.BUG, ReportType.FEATURE]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  email: z.string().email().max(255).optional(),
  // Where the submitter was when they filed this — a page path
  // (/app/vault) or full URL from window.location.href, not validated
  // beyond a length cap since it's diagnostic text, not a link anyone
  // navigates to.
  pageUrl: z.string().max(2000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
