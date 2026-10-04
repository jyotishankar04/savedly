import { db } from "../../db";
import { reports } from "../../db/schema";
import type { CreateReportInput } from "./report.schema";

export interface CreateReportResult {
  id: string;
}

export async function createReport(input: CreateReportInput, userId: string | null): Promise<CreateReportResult> {
  const [row] = await db
    .insert(reports)
    .values({
      type: input.type,
      title: input.title,
      description: input.description,
      email: input.email ?? null,
      pageUrl: input.pageUrl ?? null,
      userId,
    })
    .returning({ id: reports.id });

  return { id: row.id };
}
