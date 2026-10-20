import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { roadmapVotes } from "../../db/schema";
import { ROADMAP_VOTABLE_SLUGS, type RoadmapSlug } from "./roadmap.items";

/** Votes per item (every votable item, 0 when none), and which ones this person voted for. */
export async function roadmapVotesFor(userId: string | null) {
  const rows = await db
    .select({ slug: roadmapVotes.itemSlug, votes: count() })
    .from(roadmapVotes)
    .where(inArray(roadmapVotes.itemSlug, [...ROADMAP_VOTABLE_SLUGS]))
    .groupBy(roadmapVotes.itemSlug);
  const counts = Object.fromEntries(ROADMAP_VOTABLE_SLUGS.map((slug) => [slug, 0])) as Record<RoadmapSlug, number>;
  for (const row of rows) counts[row.slug as RoadmapSlug] = Number(row.votes);
  const mine = userId
    ? (await db.select({ slug: roadmapVotes.itemSlug }).from(roadmapVotes).where(eq(roadmapVotes.userId, userId))).map((row) => row.slug)
    : [];
  return { counts, mine };
}

/** Voting twice for the same item is a no-op. */
export async function addRoadmapVote(slug: RoadmapSlug, userId: string) {
  await db.insert(roadmapVotes).values({ itemSlug: slug, userId }).onConflictDoNothing();
  return roadmapVotesFor(userId);
}

export async function removeRoadmapVote(slug: RoadmapSlug, userId: string) {
  await db.delete(roadmapVotes).where(and(eq(roadmapVotes.itemSlug, slug), eq(roadmapVotes.userId, userId)));
  return roadmapVotesFor(userId);
}
