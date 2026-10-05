import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { whatsNewItems } from "../../db/schema";
import { AppError } from "../../shared/errors/app-error";
import type { CreateWhatsNewInput, ReorderWhatsNewInput, UpdateWhatsNewInput } from "./whats-new.schema";

const byStackOrder = [asc(whatsNewItems.sortOrder), desc(whatsNewItems.createdAt)];

/** Admin list: every item, active or not, in stack order. */
export async function listWhatsNew() {
  return db.select().from(whatsNewItems).orderBy(...byStackOrder);
}

/** Public read: the cards the landing page's popup shows, in stack order. */
export async function listActiveWhatsNew() {
  return db
    .select({
      id: whatsNewItems.id,
      kind: whatsNewItems.kind,
      title: whatsNewItems.title,
      body: whatsNewItems.body,
      bullets: whatsNewItems.bullets,
      imageUrl: whatsNewItems.imageUrl,
      ctaLabel: whatsNewItems.ctaLabel,
      ctaUrl: whatsNewItems.ctaUrl,
      updatedAt: whatsNewItems.updatedAt,
    })
    .from(whatsNewItems)
    .where(eq(whatsNewItems.isActive, true))
    .orderBy(...byStackOrder);
}

export async function createWhatsNew(input: CreateWhatsNewInput, adminUserId: string) {
  // A new card goes on top of the stack: the newest thing is what a
  // returning visitor hasn't seen.
  const [{ min }] = await db.select({ min: sql<number>`coalesce(min(${whatsNewItems.sortOrder}), 1)::int` }).from(whatsNewItems);
  const [row] = await db
    .insert(whatsNewItems)
    .values({
      kind: input.kind,
      title: input.title,
      body: input.body || null,
      bullets: input.bullets ?? [],
      imageUrl: input.imageUrl || null,
      ctaLabel: input.ctaLabel || null,
      ctaUrl: input.ctaUrl || null,
      isActive: input.isActive ?? true,
      sortOrder: min - 1,
      createdBy: adminUserId,
    })
    .returning();
  return row;
}

export async function updateWhatsNew(id: string, input: UpdateWhatsNewInput) {
  const [before] = await db.select().from(whatsNewItems).where(eq(whatsNewItems.id, id)).limit(1);
  if (!before) throw new AppError("Item not found", 404, "NOT_FOUND");

  const [after] = await db
    .update(whatsNewItems)
    .set({
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body || null } : {}),
      ...(input.bullets !== undefined ? { bullets: input.bullets } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl || null } : {}),
      ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel || null } : {}),
      ...(input.ctaUrl !== undefined ? { ctaUrl: input.ctaUrl || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(whatsNewItems.id, id))
    .returning();
  return { before, after };
}

/** Sets the stack order to the order of `ids`. Ids left out keep their place after the listed ones. */
export async function reorderWhatsNew(input: ReorderWhatsNewInput) {
  await db.transaction(async (tx) => {
    for (const [index, id] of input.ids.entries()) {
      await tx.update(whatsNewItems).set({ sortOrder: index }).where(eq(whatsNewItems.id, id));
    }
  });
  return listWhatsNew();
}

export async function deleteWhatsNew(id: string) {
  const [row] = await db.delete(whatsNewItems).where(eq(whatsNewItems.id, id)).returning();
  if (!row) throw new AppError("Item not found", 404, "NOT_FOUND");
  return row;
}
