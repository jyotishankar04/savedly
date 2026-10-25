import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { roadmapItems, roadmapVotes } from "../../db/schema";
import { RoadmapStatus } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import type { CreateRoadmapItemInput, ReorderRoadmapInput, UpdateRoadmapItemInput } from "./roadmap.schema";

const byOrder = [asc(roadmapItems.sortOrder), asc(roadmapItems.createdAt)];

async function voteCounts(): Promise<Map<string, number>> {
  const rows = await db.select({ slug: roadmapVotes.itemSlug, votes: count() }).from(roadmapVotes).groupBy(roadmapVotes.itemSlug);
  return new Map(rows.map((row) => [row.slug, Number(row.votes)]));
}

async function myVotes(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  return (await db.select({ slug: roadmapVotes.itemSlug }).from(roadmapVotes).where(eq(roadmapVotes.userId, userId))).map((row) => row.slug);
}

const publicFields = {
  slug: roadmapItems.slug,
  status: roadmapItems.status,
  title: roadmapItems.title,
  description: roadmapItems.description,
  area: roadmapItems.area,
  points: roadmapItems.points,
};

/** The public roadmap: visible items of each column in order, with vote counts on Next. */
export async function publicRoadmap() {
  const [items, counts] = await Promise.all([
    db.select(publicFields).from(roadmapItems).where(eq(roadmapItems.isActive, true)).orderBy(...byOrder),
    voteCounts(),
  ]);
  return {
    now: items.filter((item) => item.status === RoadmapStatus.NOW),
    next: items.filter((item) => item.status === RoadmapStatus.NEXT).map((item) => ({ ...item, votes: counts.get(item.slug) ?? 0 })),
  };
}

/** Vote counts for the visible planned items, and which of them this person voted for. */
export async function roadmapVotesFor(userId: string | null) {
  const [planned, counts, mine] = await Promise.all([
    db.select({ slug: roadmapItems.slug }).from(roadmapItems).where(and(eq(roadmapItems.isActive, true), eq(roadmapItems.status, RoadmapStatus.NEXT))),
    voteCounts(),
    myVotes(userId),
  ]);
  return { counts: Object.fromEntries(planned.map(({ slug }) => [slug, counts.get(slug) ?? 0])), mine };
}

/** Only a visible planned item takes votes. Voting twice is a no-op. */
export async function addRoadmapVote(slug: string, userId: string) {
  const [item] = await db
    .select({ slug: roadmapItems.slug })
    .from(roadmapItems)
    .where(and(eq(roadmapItems.slug, slug), eq(roadmapItems.isActive, true), eq(roadmapItems.status, RoadmapStatus.NEXT)))
    .limit(1);
  if (!item) throw new AppError("That roadmap item doesn't take votes", 404, "NOT_FOUND");
  await db.insert(roadmapVotes).values({ itemSlug: slug, userId }).onConflictDoNothing();
  return roadmapVotesFor(userId);
}

export async function removeRoadmapVote(slug: string, userId: string) {
  await db.delete(roadmapVotes).where(and(eq(roadmapVotes.itemSlug, slug), eq(roadmapVotes.userId, userId)));
  return roadmapVotesFor(userId);
}

/** Every item, hidden ones too, in column order, with vote counts. */
export async function listRoadmapItems() {
  const [items, counts] = await Promise.all([db.select().from(roadmapItems).orderBy(...byOrder), voteCounts()]);
  return items.map((item) => ({ ...item, votes: counts.get(item.slug) ?? 0 }));
}

/** A slug from the title, unique: "Savedly for Firefox" -> "savedly-for-firefox" (then "-2"…). */
async function uniqueSlug(title: string): Promise<string> {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "item";
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [taken] = await db.select({ id: roadmapItems.id }).from(roadmapItems).where(eq(roadmapItems.slug, slug)).limit(1);
    if (!taken) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createRoadmapItem(input: CreateRoadmapItemInput) {
  // A new item goes to the bottom of its column.
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${roadmapItems.sortOrder}), -1)::int` })
    .from(roadmapItems)
    .where(eq(roadmapItems.status, input.status));
  const [row] = await db
    .insert(roadmapItems)
    .values({
      slug: await uniqueSlug(input.title),
      status: input.status,
      title: input.title,
      description: input.description,
      area: input.area || null,
      points: input.points ?? [],
      isActive: input.isActive ?? true,
      sortOrder: max + 1,
    })
    .returning();
  return row;
}

export async function updateRoadmapItem(id: string, input: UpdateRoadmapItemInput) {
  const [before] = await db.select().from(roadmapItems).where(eq(roadmapItems.id, id)).limit(1);
  if (!before) throw new AppError("Item not found", 404, "NOT_FOUND");
  // Moved to the other column: it goes to the bottom there.
  let sortOrder: number | undefined;
  if (input.status && input.status !== before.status) {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${roadmapItems.sortOrder}), -1)::int` })
      .from(roadmapItems)
      .where(eq(roadmapItems.status, input.status));
    sortOrder = max + 1;
  }
  const [after] = await db
    .update(roadmapItems)
    .set({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.area !== undefined ? { area: input.area || null } : {}),
      ...(input.points !== undefined ? { points: input.points } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(roadmapItems.id, id))
    .returning();
  return { before, after };
}

export async function reorderRoadmap(input: ReorderRoadmapInput) {
  await db.transaction(async (tx) => {
    for (const [index, id] of input.ids.entries()) {
      await tx
        .update(roadmapItems)
        .set({ sortOrder: index })
        .where(and(eq(roadmapItems.id, id), eq(roadmapItems.status, input.status)));
    }
  });
  return listRoadmapItems();
}

/** Deleting an item deletes its votes too. */
export async function deleteRoadmapItem(id: string) {
  const [row] = await db.delete(roadmapItems).where(eq(roadmapItems.id, id)).returning();
  if (!row) throw new AppError("Item not found", 404, "NOT_FOUND");
  return row;
}
