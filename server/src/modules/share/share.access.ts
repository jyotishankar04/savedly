import { and, eq, sql } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../../db";
import {
  collectionMemories,
  collections,
  memories,
  shareAccessRequests,
  shareGrants,
  shares,
  users,
} from "../../db/schema";
import {
  ShareAccessRequestStatus,
  ShareGrantStatus,
  ShareLinkAccess,
  ShareResourceType,
  type MemoryType,
} from "../../db/enums";
import { SHARE_TOKEN_COOKIE } from "../../shared/utils/cookies";
import { verifyShareToken } from "../../shared/utils/jwt";
import { logger } from "../../shared/utils/logger";

export type ShareRow = typeof shares.$inferSelect;

/** What a gate screen is allowed to know — never the contents, never the real title. */
export interface ShareStub {
  slug: string;
  resourceType: ShareResourceType;
  linkAccess: ShareLinkAccess;
  ownerName: string | null;
}

export type ShareDecision =
  | { outcome: "allow"; share: ShareRow; via: "owner" | "grant" | "public" | "password" }
  | { outcome: "password_required"; stub: ShareStub }
  | { outcome: "auth_required"; stub: ShareStub }
  | { outcome: "request_required"; stub: ShareStub; myRequest: "none" | "pending" | "denied" }
  | { outcome: "not_found" };

/**
 * Reads the unlock cookie. Returns the share ids this browser has proven a
 * password for, each with the `pv` (passwordUpdatedAt) it was minted
 * against — see resolveShareAccess for why that matters.
 */
export function readUnlockedShares(req: Request): { id: string; pv: number }[] {
  const raw = req.cookies?.[SHARE_TOKEN_COOKIE];
  if (!raw) return [];
  return verifyShareToken(raw)?.shares ?? [];
}

function toStub(share: ShareRow, ownerName: string | null): ShareStub {
  return {
    slug: share.slug,
    resourceType: share.resourceType as ShareResourceType,
    linkAccess: share.linkAccess as ShareLinkAccess,
    ownerName,
  };
}

/**
 * The single authorization decision for every public read of a shared link.
 *
 * Order matters and is deliberate: owner and grant checks run BEFORE the
 * link mode, so someone the resource was shared with directly still gets in
 * when the link itself is switched off. That is what makes "share with a
 * person" independent of "what the link does" rather than a fifth mode.
 *
 * Every rejection that isn't a live gate returns `not_found`, never a 403 —
 * a disabled, expired or trashed share must be indistinguishable from a
 * slug that never existed, or the response itself confirms the resource.
 */
export async function resolveShareAccess(
  slug: string,
  viewerUserId: string | null,
  unlocked: { id: string; pv: number }[]
): Promise<ShareDecision> {
  const [row] = await db
    .select({
      share: shares,
      ownerName: users.name,
      collectionExists: collections.id,
      memoryId: memories.id,
      memoryInTrash: memories.inTrash,
    })
    .from(shares)
    .innerJoin(users, eq(users.id, shares.ownerId))
    .leftJoin(collections, eq(collections.id, shares.collectionId))
    .leftJoin(memories, eq(memories.id, shares.memoryId))
    .where(eq(shares.slug, slug))
    .limit(1);

  if (!row) return { outcome: "not_found" };

  const { share } = row;

  // FKs cascade, so a missing row means the resource is gone. Trash is a
  // soft delete the FK can't see, hence the explicit check.
  const resourceGone =
    share.resourceType === ShareResourceType.COLLECTION ? !row.collectionExists : !row.memoryId || row.memoryInTrash;
  if (resourceGone) return { outcome: "not_found" };

  if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) return { outcome: "not_found" };

  if (viewerUserId && viewerUserId === share.ownerId) {
    return { outcome: "allow", share, via: "owner" };
  }

  if (viewerUserId) {
    const [grant] = await db
      .select({ id: shareGrants.id })
      .from(shareGrants)
      .where(
        and(
          eq(shareGrants.shareId, share.id),
          eq(shareGrants.userId, viewerUserId),
          eq(shareGrants.status, ShareGrantStatus.ACTIVE)
        )
      )
      .limit(1);

    if (grant) return { outcome: "allow", share, via: "grant" };
  }

  const stub = toStub(share, row.ownerName);

  switch (share.linkAccess as ShareLinkAccess) {
    case ShareLinkAccess.PUBLIC:
      return { outcome: "allow", share, via: "public" };

    case ShareLinkAccess.PASSWORD: {
      // The pv comparison is what makes changing the password revoke every
      // cookie already issued, without storing them server-side.
      const proof = unlocked.find((entry) => entry.id === share.id);
      const currentPv = share.passwordUpdatedAt?.getTime() ?? 0;
      if (proof && proof.pv === currentPv) return { outcome: "allow", share, via: "password" };
      return { outcome: "password_required", stub };
    }

    case ShareLinkAccess.REQUEST: {
      if (!viewerUserId) return { outcome: "auth_required", stub };

      const [existing] = await db
        .select({ status: shareAccessRequests.status })
        .from(shareAccessRequests)
        .where(
          and(eq(shareAccessRequests.shareId, share.id), eq(shareAccessRequests.requesterUserId, viewerUserId))
        )
        .orderBy(sql`${shareAccessRequests.createdAt} desc`)
        .limit(1);

      const myRequest =
        existing?.status === ShareAccessRequestStatus.PENDING
          ? "pending"
          : existing?.status === ShareAccessRequestStatus.DENIED
            ? "denied"
            : "none";

      return { outcome: "request_required", stub, myRequest };
    }

    case ShareLinkAccess.DISABLED:
    default:
      return { outcome: "not_found" };
  }
}

// -----------------------------------------------------------------------------
// Public payloads
//
// Built field-by-field on purpose. These responses are reachable without any
// authentication, so a `select()` that spreads a whole row would silently
// start leaking every column added to `memories` in future. Never widen
// these without deciding, per column, that it is public-safe.
//
// Excluded deliberately: userId, documentEmbedding, ftsTokens, browserCapture,
// extractedFields, inferredIntent, keywords, fetchStatus, captureMethod,
// canonicalUrl, normalizedUrl, platform, isFavorite, isArchived, inTrash.
// -----------------------------------------------------------------------------

export interface SharedMemoryItem {
  id: string;
  type: MemoryType;
  title: string;
  url: string | null;
  description: string | null;
  content: string | null;
  faviconUrl: string | null;
  previewImageUrl: string | null;
  createdAt: Date;
}

export interface SharedResourcePayload {
  resourceType: ShareResourceType;
  slug: string;
  allowSearchIndexing: boolean;
  ownerName: string | null;
  collection: { name: string; icon: string; description: string | null } | null;
  memories: SharedMemoryItem[];
}

const sharedMemoryColumns = {
  id: memories.id,
  type: memories.type,
  title: memories.title,
  url: memories.url,
  description: memories.description,
  content: memories.content,
  faviconUrl: memories.faviconUrl,
  previewImageUrl: memories.previewImageUrl,
  createdAt: memories.createdAt,
};

export async function getSharedPayload(share: ShareRow): Promise<SharedResourcePayload> {
  const [owner] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, share.ownerId))
    .limit(1);

  const base = {
    resourceType: share.resourceType as ShareResourceType,
    slug: share.slug,
    allowSearchIndexing: share.allowSearchIndexing,
    ownerName: owner?.name ?? null,
  };

  if (share.resourceType === ShareResourceType.MEMORY) {
    const items = await db
      .select(sharedMemoryColumns)
      .from(memories)
      .where(and(eq(memories.id, share.memoryId!), eq(memories.inTrash, false), eq(memories.isVaulted, false)))
      .limit(1);

    return { ...base, collection: null, memories: items as SharedMemoryItem[] };
  }

  const [collection] = await db
    .select({ name: collections.name, icon: collections.icon, description: collections.description })
    .from(collections)
    .where(eq(collections.id, share.collectionId!))
    .limit(1);

  // Archived is filtered as well as trashed: an owner who archives something
  // has taken it out of their own active view, and it reading as still-public
  // is the more surprising of the two behaviours.
  const items = await db
    .select(sharedMemoryColumns)
    .from(collectionMemories)
    .innerJoin(memories, eq(memories.id, collectionMemories.memoryId))
    .where(
      and(
        eq(collectionMemories.collectionId, share.collectionId!),
        eq(memories.inTrash, false),
        eq(memories.isVaulted, false),
        eq(memories.isArchived, false)
      )
    )
    .orderBy(memories.createdAt);

  return {
    ...base,
    collection: collection ?? null,
    memories: items as SharedMemoryItem[],
  };
}

// recordShareView moved to share.views.ts — it's now identity-aware and
// deduped, not a bare counter bump.

