import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { shareGrants, shares, users } from "../../db/schema";
import { ShareGrantSource, ShareGrantStatus } from "../../db/enums";
import { AppError } from "../../shared/errors/app-error";
import { notifyShareInvite } from "./share.notify";
import { assertFeature } from "../plans/api";
import { loadOwnedShare } from "./share.links";

export interface GrantResponse {
  id: string;
  email: string;
  userId: string | null;
  name: string | null;
  status: ShareGrantStatus;
  createdAt: Date;
}

export async function listGrants(userId: string, shareId: string): Promise<GrantResponse[]> {
  await loadOwnedShare(userId, shareId);

  const rows = await db
    .select({
      id: shareGrants.id,
      email: shareGrants.inviteeEmail,
      userId: shareGrants.userId,
      name: users.name,
      status: shareGrants.status,
      createdAt: shareGrants.createdAt,
    })
    .from(shareGrants)
    .leftJoin(users, eq(users.id, shareGrants.userId))
    .where(and(eq(shareGrants.shareId, shareId), sql`${shareGrants.status} <> 'revoked'`))
    .orderBy(desc(shareGrants.createdAt));

  return rows.map((row) => ({ ...row, status: row.status as ShareGrantStatus }));
}

/**
 * Always creates a row and returns the same shape whether or not the account exists, so this isn't
 * an account-enumeration oracle.
 */
export async function inviteByEmail(userId: string, shareId: string, email: string): Promise<GrantResponse> {
  const share = await loadOwnedShare(userId, shareId);
  await assertFeature(userId, "directShares");

  const [owner] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  if (owner?.email.toLowerCase() === email) {
    throw new AppError("You already have access to this", 400, "BAD_REQUEST");
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  const [row] = await db
    .insert(shareGrants)
    .values({
      shareId,
      inviteeEmail: email,
      userId: existingUser?.id ?? null,
      // An existing account is granted at once; an unknown address waits for signup
      // (claimPendingGrantsForEmail).
      status: existingUser ? ShareGrantStatus.ACTIVE : ShareGrantStatus.PENDING,
      source: ShareGrantSource.DIRECT_INVITE,
      invitedBy: userId,
      acceptedAt: existingUser ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [shareGrants.shareId, shareGrants.inviteeEmail],
      // Re-inviting a revoked person restores them: that's what typing the address again means.
      set: {
        userId: existingUser?.id ?? null,
        status: existingUser ? ShareGrantStatus.ACTIVE : ShareGrantStatus.PENDING,
        acceptedAt: existingUser ? new Date() : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  notifyShareInvite({ granteeUserId: existingUser?.id ?? null, email, share, ownerName: owner?.name ?? null });

  return {
    id: row.id,
    email: row.inviteeEmail,
    userId: row.userId,
    name: null,
    status: row.status as ShareGrantStatus,
    createdAt: row.createdAt,
  };
}

export async function revokeGrant(userId: string, shareId: string, grantId: string): Promise<void> {
  // Ownership is enforced by joining through shares in the same statement, never load-then-check.
  const [grant] = await db
    .select({ id: shareGrants.id })
    .from(shareGrants)
    .innerJoin(shares, eq(shares.id, shareGrants.shareId))
    .where(and(eq(shareGrants.id, grantId), eq(shareGrants.shareId, shareId), eq(shares.ownerId, userId)))
    .limit(1);

  if (!grant) throw new AppError("Invite not found", 404, "NOT_FOUND");

  // Kept as a revoked row, not deleted, or a pending invite would reactivate if that person signed up later.
  await db
    .update(shareGrants)
    .set({ status: ShareGrantStatus.REVOKED, updatedAt: new Date() })
    .where(eq(shareGrants.id, grantId));
}

/**
 * Called from the OAuth callback on every login so an invite that arrived since sign-up isn't left pending.
 * Gated on a provider-verified email, or a provider that doesn't verify addresses would let anyone claim invites sent to someone else.
 */
export async function claimPendingGrantsForEmail(
  userId: string,
  email: string,
  emailVerified: boolean
): Promise<number> {
  if (!emailVerified) return 0;

  const claimed = await db
    .update(shareGrants)
    .set({ userId, status: ShareGrantStatus.ACTIVE, acceptedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        isNull(shareGrants.userId), // here isNull checks that the grant is still pending
        eq(shareGrants.status, ShareGrantStatus.PENDING),
        eq(shareGrants.inviteeEmail, email.toLowerCase())
      )
    )
    .returning({ id: shareGrants.id });

  return claimed.length;
}
