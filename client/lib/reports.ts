import { apiFetch } from "@/lib/auth";

export type ReportType = "bug" | "feature";

export interface CreateReportInput {
  type: ReportType;
  title: string;
  description: string;
  email?: string;
  pageUrl?: string;
}

export interface CreateReportResult {
  id: string;
}

/** Public — no auth required, matches server/src/modules/report. */
export async function submitReport(input: CreateReportInput): Promise<CreateReportResult> {
  return apiFetch<CreateReportResult>("/reports", { method: "POST", body: input });
}
