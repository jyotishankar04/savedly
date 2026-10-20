import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { contactMessages, reports, users } from "../../db/schema";
import { ContactMessageStatus, ReportStatus } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import type { ListContactQuery, ListReportsQuery } from "./messages.schema";

// Admin > Messages: what people send from the website, in one place.
// Contact-page messages (contactMessages) and bug reports and ideas from
// /report (reports), each with a status the team moves along.

const PAGE_SIZE = 30;
const like = (q: string) => `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

export async function listContactMessages(query: ListContactQuery) {
  const filters: SQL[] = [];
  if (query.status) filters.push(eq(contactMessages.status, query.status));
  if (query.q) filters.push(or(ilike(contactMessages.name, like(query.q)), ilike(contactMessages.email, like(query.q)), ilike(contactMessages.message, like(query.q)))!);
  const where = filters.length ? and(...filters) : undefined;
  const [items, [{ total }], byStatus] = await Promise.all([
    db
      .select({
        id: contactMessages.id,
        name: contactMessages.name,
        email: contactMessages.email,
        topic: contactMessages.topic,
        message: contactMessages.message,
        status: contactMessages.status,
        emailedAt: contactMessages.emailedAt,
        createdAt: contactMessages.createdAt,
        userId: contactMessages.userId,
        userEmail: users.email,
        userName: users.name,
      })
      .from(contactMessages)
      .leftJoin(users, eq(users.id, contactMessages.userId))
      .where(where)
      .orderBy(desc(contactMessages.createdAt))
      .limit(PAGE_SIZE)
      .offset((query.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(contactMessages).where(where),
    db.select({ status: contactMessages.status, n: count() }).from(contactMessages).groupBy(contactMessages.status),
  ]);
  return { items, total: Number(total), pageSize: PAGE_SIZE, counts: Object.fromEntries(byStatus.map((row) => [row.status, Number(row.n)])) };
}

export async function updateContactMessage(id: string, status: ContactMessageStatus) {
  const [before] = await db.select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1);
  if (!before) throw new AppError("Message not found", 404, "NOT_FOUND");
  const [after] = await db.update(contactMessages).set({ status, updatedAt: new Date() }).where(eq(contactMessages.id, id)).returning();
  return { before, after };
}

export async function deleteContactMessage(id: string) {
  const [row] = await db.delete(contactMessages).where(eq(contactMessages.id, id)).returning();
  if (!row) throw new AppError("Message not found", 404, "NOT_FOUND");
  return row;
}

export async function listReports(query: ListReportsQuery) {
  const filters: SQL[] = [];
  if (query.status) filters.push(eq(reports.status, query.status));
  if (query.type) filters.push(eq(reports.type, query.type));
  if (query.q) filters.push(or(ilike(reports.title, like(query.q)), ilike(reports.description, like(query.q)), ilike(reports.email, like(query.q)))!);
  const where = filters.length ? and(...filters) : undefined;
  const [items, [{ total }], byStatus] = await Promise.all([
    db
      .select({
        id: reports.id,
        type: reports.type,
        title: reports.title,
        description: reports.description,
        email: reports.email,
        pageUrl: reports.pageUrl,
        status: reports.status,
        createdAt: reports.createdAt,
        userId: reports.userId,
        userEmail: users.email,
        userName: users.name,
      })
      .from(reports)
      .leftJoin(users, eq(users.id, reports.userId))
      .where(where)
      .orderBy(desc(reports.createdAt))
      .limit(PAGE_SIZE)
      .offset((query.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(reports).where(where),
    db.select({ status: reports.status, n: count() }).from(reports).groupBy(reports.status),
  ]);
  return { items, total: Number(total), pageSize: PAGE_SIZE, counts: Object.fromEntries(byStatus.map((row) => [row.status, Number(row.n)])) };
}

export async function updateReport(id: string, status: ReportStatus) {
  const [before] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!before) throw new AppError("Report not found", 404, "NOT_FOUND");
  const [after] = await db.update(reports).set({ status, updatedAt: new Date() }).where(eq(reports.id, id)).returning();
  return { before, after };
}

export async function deleteReport(id: string) {
  const [row] = await db.delete(reports).where(eq(reports.id, id)).returning();
  if (!row) throw new AppError("Report not found", 404, "NOT_FOUND");
  return row;
}

/** What's waiting: new contact messages and open reports, for the admin menu. */
export async function messageCounts() {
  const [[{ contact }], [{ open }]] = await Promise.all([
    db.select({ contact: count() }).from(contactMessages).where(eq(contactMessages.status, ContactMessageStatus.NEW)),
    db.select({ open: count() }).from(reports).where(eq(reports.status, ReportStatus.OPEN)),
  ]);
  return { newContact: Number(contact), openReports: Number(open) };
}
