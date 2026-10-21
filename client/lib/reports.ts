import { ApiError, apiFetch } from "@/lib/auth";
import { TOO_MANY_MESSAGES } from "@/lib/contact";

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
  try {
    return await apiFetch<CreateReportResult>("/reports", { method: "POST", body: input });
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) throw new ApiError(TOO_MANY_MESSAGES, 429, err.code);
    throw err;
  }
}
