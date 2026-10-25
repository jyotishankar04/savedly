import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { collectionMemories, collections, memories } from "../../db/schema";
import { CollectionSource, PlanLimitType } from "../../db/enums";
import { assertFeature, assertWithinLimit } from "../plans/api";
import { AppError } from "../../shared/errors/app-error";
import type { CreateCollectionInput, ListCollectionsQuery, UpdateCollectionInput } from "./collection.schema";

/**
 * Clients render a collection's icon as text, so it must be an emoji; anything else (like "book")
 * becomes the folder.
 */
export const DEFAULT_COLLECTION_ICON = "📁";
export function collectionIcon(icon: string | undefined | null): string {
  const trimmed = icon?.trim() ?? "";
  return /^\p{Extended_Pictographic}/u.test(trimmed) ? trimmed : DEFAULT_COLLECTION_ICON;
}

export interface CollectionResponse {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  source: CollectionSource;
  memoryCount: number;
  isVaulted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function listCollections(userId: string, query: ListCollectionsQuery): Promise<CollectionResponse[]> {
  // Like memories' isVaulted: hidden by default; only the vault page passes isVaulted=true, after
  // the route guard confirmed the PIN.
  const conditions = [eq(collections.userId, userId), eq(collections.isVaulted, query.isVaulted)];
  if (!query.includeSystem) {
    conditions.push(eq(collections.source, CollectionSource.USER));
  }

  return db
    .select({
      id: collections.id,
      name: collections.name,
      icon: collections.icon,
      description: collections.description,
      source: collections.source,
      isVaulted: collections.isVaulted,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      memoryCount: count(collectionMemories.memoryId),
    })
    .from(collections)
    .leftJoin(collectionMemories, eq(collectionMemories.collectionId, collections.id))
    .where(and(...conditions))
    .groupBy(collections.id);
}

/**
 * One collection for its page, fetched by id so a just-made one opens at once. Vaulted collections
 * open only from the vault, so they read as not found here.
 */
export async function getCollection(userId: string, id: string): Promise<CollectionResponse> {
  const [row] = await db
    .select({
      id: collections.id,
      name: collections.name,
      icon: collections.icon,
      description: collections.description,
      source: collections.source,
      isVaulted: collections.isVaulted,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      memoryCount: count(collectionMemories.memoryId),
    })
    .from(collections)
    .leftJoin(collectionMemories, eq(collectionMemories.collectionId, collections.id))
    .where(and(eq(collections.id, id), eq(collections.userId, userId), eq(collections.isVaulted, false)))
    .groupBy(collections.id);
  if (!row) throw new AppError("Collection not found", 404, "COLLECTION_NOT_FOUND");
  return row;
}

/**
 * Collections the user filed into most recently (latest saves, newest first, no repeats), for
 * one-tap filing in the extension.
 */
export async function recentCollections(userId: string, limit = 6): Promise<{ id: string; name: string; icon: string }[]> {
  const rows = await db
    .select({ id: collections.id, name: collections.name, icon: collections.icon })
    .from(memories)
    .innerJoin(collectionMemories, eq(collectionMemories.memoryId, memories.id))
    .innerJoin(collections, eq(collections.id, collectionMemories.collectionId))
    .where(and(eq(memories.userId, userId), eq(memories.inTrash, false), eq(collections.isVaulted, false)))
    .orderBy(desc(memories.createdAt))
    .limit(80);
  const seen = new Set<string>();
  return rows.filter((r) => !seen.has(r.id) && seen.add(r.id)).slice(0, limit);
}

export async function createCollection(
  userId: string,
  input: CreateCollectionInput,
): Promise<CollectionResponse> {
  // Made through this endpoint, so user-owned: the only ones that count toward the limit.
  await assertWithinLimit(userId, PlanLimitType.COLLECTION_COUNT, 1);
  const [row] = await db
    .insert(collections)
    .values({ userId, name: input.name, icon: collectionIcon(input.icon), description: input.description, source: CollectionSource.USER })
    .returning();

  return { ...row, memoryCount: 0 };
}

export async function updateCollection(
  userId: string,
  id: string,
  input: UpdateCollectionInput,
): Promise<CollectionResponse> {
  if (input.isVaulted === true) await assertFeature(userId, "vault");
  const columns: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) columns.name = input.name;
  if (input.icon !== undefined) columns.icon = collectionIcon(input.icon);
  if (input.description !== undefined) columns.description = input.description;
  if (input.isVaulted !== undefined) columns.isVaulted = input.isVaulted;

  const row = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(collections)
      .set(columns)
      .where(and(eq(collections.id, id), eq(collections.userId, userId)))
      .returning();

    if (!updated) {
      throw new AppError("Collection not found", 404, "NOT_FOUND");
    }

    // Vaulting cascades to the collection's memories, so reads only check memories.isVaulted.
    // Known imprecision, accepted: un-vaulting also un-vaults members vaulted individually
    // (tracking it would need its own column).
    if (input.isVaulted !== undefined) {
      await tx
        .update(memories)
        .set({ isVaulted: input.isVaulted })
        .where(
          inArray(
            memories.id,
            tx.select({ id: collectionMemories.memoryId }).from(collectionMemories).where(eq(collectionMemories.collectionId, id)),
          ),
        );
    }

    return updated;
  });

  const [{ value: memoryCount }] = await db
    .select({ value: count() })
    .from(collectionMemories)
    .where(eq(collectionMemories.collectionId, id));

  return { ...row, memoryCount };
}

/** One-way system -> user: nothing sets source back to "system". */
export async function convertToUser(userId: string, id: string): Promise<CollectionResponse> {
  const [existing] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new AppError("Collection not found", 404, "NOT_FOUND");
  }
  if (existing.source === CollectionSource.USER) {
    throw new AppError("This collection is already yours", 400, "ALREADY_USER_COLLECTION");
  }
  await assertWithinLimit(userId, PlanLimitType.COLLECTION_COUNT, 1);

  const [row] = await db
    .update(collections)
    .set({ source: CollectionSource.USER, convertedFromSystemAt: new Date(), updatedAt: new Date() })
    .where(eq(collections.id, id))
    .returning();

  const [{ value: memoryCount }] = await db
    .select({ value: count() })
    .from(collectionMemories)
    .where(eq(collectionMemories.collectionId, id));

  return { ...row, memoryCount };
}

export async function deleteCollection(userId: string, id: string): Promise<void> {
  const [deleted] = await db
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)))
    .returning({ id: collections.id });

  if (!deleted) {
    throw new AppError("Collection not found", 404, "NOT_FOUND");
  }
}
