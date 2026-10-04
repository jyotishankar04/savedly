import { and, desc, eq, gte, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "../../db";
import { announcements } from "../../db/schema";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/utils/logger";
import { EmailCategory } from "../../db/enums";
import { sendBulkEmail } from "../email";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "./announcements.schema";

export async function listAnnouncements() {
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

/** Only one announcement may be active at a time — enforced here, not by a DB constraint. */
export async function createAnnouncement(input: CreateAnnouncementInput, adminUserId: string) {
  const row = await db.transaction(async (tx) => {
    if (input.isActive) {
      await tx.update(announcements).set({ isActive: false }).where(eq(announcements.isActive, true));
    }

    const [row] = await tx
      .insert(announcements)
      .values({
        type: input.type,
        displayMode: input.displayMode,
        title: input.title,
        message: input.message,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        ctaLabel: input.ctaLabel ?? null,
        ctaUrl: input.ctaUrl ?? null,
        isActive: input.isActive ?? false,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        createdBy: adminUserId,
      })
      .returning();

    return row;
  });

  if (input.notifyByEmail) {
    sendBulkEmail({
      subject: row.title,
      bodyText: row.message,
      category: EmailCategory.ANNOUNCEMENT,
      recipients: { all: true },
      createdBy: adminUserId,
      auditAction: "email.announcement_sent",
    }).catch((err) => logger.warn({ err, announcementId: row.id }, "Failed to send announcement email"));
  }

  return row;
}

export async function updateAnnouncement(id: string, input: UpdateAnnouncementInput) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(announcements).where(eq(announcements.id, id)).limit(1);
    if (!before) {
      throw new AppError("Announcement not found", 404, "NOT_FOUND");
    }

    if (input.isActive) {
      await tx.update(announcements).set({ isActive: false }).where(and(eq(announcements.isActive, true), ne(announcements.id, id)));
    }

    const [after] = await tx
      .update(announcements)
      .set({
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.displayMode !== undefined ? { displayMode: input.displayMode } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.message !== undefined ? { message: input.message } : {}),
        ...(input.targetDate !== undefined ? { targetDate: input.targetDate ? new Date(input.targetDate) : null } : {}),
        ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel } : {}),
        ...(input.ctaUrl !== undefined ? { ctaUrl: input.ctaUrl } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt ? new Date(input.startsAt) : null } : {}),
        ...(input.endsAt !== undefined ? { endsAt: input.endsAt ? new Date(input.endsAt) : null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id))
      .returning();

    return { before, after };
  });
}

export async function deleteAnnouncement(id: string) {
  const [row] = await db.delete(announcements).where(eq(announcements.id, id)).returning();
  if (!row) {
    throw new AppError("Announcement not found", 404, "NOT_FOUND");
  }
  return row;
}

/** Public read — the active announcement within its optional scheduling window, if any. */
export async function getActiveAnnouncement() {
  const now = new Date();
  const [row] = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.isActive, true),
        or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
        or(isNull(announcements.endsAt), gte(announcements.endsAt, now)),
      ),
    )
    .orderBy(desc(announcements.createdAt))
    .limit(1);

  return row ?? null;
}
