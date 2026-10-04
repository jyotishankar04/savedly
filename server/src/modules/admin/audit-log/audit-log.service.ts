import { count, desc } from "drizzle-orm";
import { db } from "../../../db";
import { adminAuditLogs } from "../../../db/schema";
import type { AuditLogQuery } from "./audit-log.schema";

export async function getAuditLog(
  query: AuditLogQuery,
): Promise<{ items: (typeof adminAuditLogs.$inferSelect)[]; page: number; limit: number; total: number }> {
  const [{ value: total }] = await db.select({ value: count() }).from(adminAuditLogs);

  const items = await db
    .select()
    .from(adminAuditLogs)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return { items, page: query.page, limit: query.limit, total };
}
