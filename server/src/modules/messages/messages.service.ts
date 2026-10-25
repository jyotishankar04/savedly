import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { contactMessages, messageReplies, reports, users } from "../../db/schema";
import { getSection } from "../../platform/instance-settings/instance-settings.service";
import { isEmailEnabled, sendMail } from "../../platform/mailer/mailer";
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
  if (query.statuses.length) filters.push(inArray(contactMessages.status, query.statuses));
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
  await db.delete(messageReplies).where(and(eq(messageReplies.kind, "contact"), eq(messageReplies.targetId, id)));
  return row;
}

export async function listReports(query: ListReportsQuery) {
  const filters: SQL[] = [];
  if (query.statuses.length) filters.push(inArray(reports.status, query.statuses));
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
  await db.delete(messageReplies).where(and(eq(messageReplies.kind, "report"), eq(messageReplies.targetId, id)));
  return row;
}

/** Every folder's count, and whether replies can be emailed from here. */
export async function messageCounts() {
  const [contactRows, reportRows, emailEnabled] = await Promise.all([
    db.select({ status: contactMessages.status, n: count() }).from(contactMessages).groupBy(contactMessages.status),
    db.select({ type: reports.type, status: reports.status, n: count() }).from(reports).groupBy(reports.type, reports.status),
    isEmailEnabled(),
  ]);
  const contact = Object.fromEntries(contactRows.map((row) => [row.status, Number(row.n)])) as Partial<Record<ContactMessageStatus, number>>;
  const reportCounts: Record<string, Partial<Record<ReportStatus, number>>> = { bug: {}, feature: {} };
  for (const row of reportRows) reportCounts[row.type]![row.status] = Number(row.n);
  return {
    contact,
    reports: reportCounts,
    newContact: contact[ContactMessageStatus.NEW] ?? 0,
    openReports: (reportCounts.bug![ReportStatus.OPEN] ?? 0) + (reportCounts.feature![ReportStatus.OPEN] ?? 0),
    emailEnabled,
  };
}

// ---- Replies ----------------------------------------------------------------------

export type ReplyKind = "contact" | "report";

/** The replies sent so far, oldest first, with who sent each. */
export async function listReplies(kind: ReplyKind, targetId: string) {
  return db
    .select({ id: messageReplies.id, body: messageReplies.body, toEmail: messageReplies.toEmail, createdAt: messageReplies.createdAt, adminName: users.name, adminEmail: users.email })
    .from(messageReplies)
    .leftJoin(users, eq(users.id, messageReplies.adminUserId))
    .where(and(eq(messageReplies.kind, kind), eq(messageReplies.targetId, targetId)))
    .orderBy(asc(messageReplies.createdAt));
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const paragraphs = (text: string) => escape(text).replace(/\r?\n/g, "<br>");

/**
 * Emails a reply to the person who wrote in, quoting their message, from the server address with
 * Reply-To set to the contact address. Saved for the reading pane; a contact message becomes
 * Replied, an open report Reviewing.
 */
export async function sendReply(kind: ReplyKind, targetId: string, body: string, adminUserId: string) {
  const target =
    kind === "contact"
      ? await db.select().from(contactMessages).where(eq(contactMessages.id, targetId)).limit(1).then(([m]) => m && { email: m.email, name: m.name, subject: m.topic, original: m.message, at: m.createdAt })
      : await db
          .select({ report: reports, userEmail: users.email })
          .from(reports)
          .leftJoin(users, eq(users.id, reports.userId))
          .where(eq(reports.id, targetId))
          .limit(1)
          .then(([row]) => row && { email: row.report.email ?? row.userEmail, name: null, subject: row.report.title, original: row.report.description, at: row.report.createdAt });
  if (!target) throw new AppError("Not found", 404, "NOT_FOUND");
  if (!target.email) throw new AppError("They didn't leave an email address, so there's no one to reply to.", 400, "NO_EMAIL");
  const settings = (await getSection("email")) as { contactAddress?: string };
  if (!(await isEmailEnabled())) throw new AppError("Email isn't set up on this server (Infrastructure › Email), so replies can't be sent from here.", 503, "EMAIL_OFF");

  const when = target.at.toUTCString();
  try {
    await sendMail({
      to: target.email,
      replyTo: settings.contactAddress || undefined,
      subject: `Re: ${target.subject.replace(/[\r\n]/g, " ")}`,
      html: [
        `<div>${paragraphs(body)}</div>`,
        `<p style="color:#666;margin-top:24px">On ${escape(when)}${target.name ? `, ${escape(target.name)}` : ""} wrote:</p>`,
        `<blockquote style="margin:0;padding-left:12px;border-left:3px solid #ddd;color:#555">${paragraphs(target.original)}</blockquote>`,
      ].join(""),
    });
  } catch {
    throw new AppError("The reply couldn't be sent just now. Try again in a moment.", 502, "SEND_FAILED");
  }
  const [reply] = await db.insert(messageReplies).values({ kind, targetId, adminUserId, toEmail: target.email, body }).returning();
  if (kind === "contact") await db.update(contactMessages).set({ status: ContactMessageStatus.REPLIED, updatedAt: new Date() }).where(eq(contactMessages.id, targetId));
  else await db.update(reports).set({ status: ReportStatus.REVIEWING, updatedAt: new Date() }).where(and(eq(reports.id, targetId), eq(reports.status, ReportStatus.OPEN)));
  return reply;
}
