import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { collectionMemories, collections, memories } from "../../db/schema";
import { CollectionSource, PlanLimitType } from "../../db/enums";
import { assertFeature, assertWithinLimit } from "../plans/plans.service";
import { AppError } from "../../shared/errors/app-error";
import type { CreateCollectionInput, ListCollectionsQuery, UpdateCollectionInput } from "./collection.schema";

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
  // Toggleable like memories' isVaulted — hidden by default; the vault page
  // is the only caller that passes isVaulted=true, and only after the route
  // guard (requireVaultUnlockedForQuery) has confirmed the PIN was entered.
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

export async function createCollection(
  userId: string,
  input: CreateCollectionInput,
): Promise<CollectionResponse> {
  // Every collection created through this endpoint is user-owned — system
  // collections come from internal processes (onboarding defaults,
  // AI-suggested groupings), never this API — and only these count against
  // the plan's collection limit.
  await assertWithinLimit(userId, PlanLimitType.COLLECTION_COUNT, 1);
  const [row] = await db
    .insert(collections)
    .values({ userId, name: input.name, icon: input.icon, description: input.description, source: CollectionSource.USER })
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
  if (input.icon !== undefined) columns.icon = input.icon;
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

    // Vaulting/un-vaulting a collection cascades to its member memories —
    // that's the whole point of hiding a *collection*, and it means every
    // normal read path only ever needs to check memories.isVaulted, never
    // join through collection_memories to ask "is this in a vaulted folder".
    //
    // Known imprecision, accepted deliberately: un-vaulting the collection
    // un-vaults every member memory too, even one a user vaulted
    // individually before adding it here. Tracking "vaulted via which
    // collection" would need its own column; not worth it for a personal
    // privacy feature where the fix is one click.
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

/**
 * One-way system -> user conversion. There is deliberately no path back —
 * nothing in this module ever sets source to "system", so a collection that
 * has been converted (or was user-created to begin with) can never revert.
 */
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
