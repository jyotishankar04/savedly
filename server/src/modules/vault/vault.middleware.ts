import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { AppError } from "../../shared/errors/app-error";
import { VAULT_TOKEN_COOKIE, setVaultTokenCookie } from "../../shared/utils/cookies";
import { signVaultToken, verifyVaultToken } from "../../shared/utils/jwt";

/**
 * Guards every route that actually reads vaulted content. Must run after
 * `authenticate` — it trusts `req.user` already being set.
 *
 * On success it re-issues the cookie with a fresh 30-minute window, which is
 * what turns the token's fixed TTL into a sliding "unlocked while active"
 * session rather than a hard cutoff regardless of activity.
 */
export async function requireVaultUnlocked(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[VAULT_TOKEN_COOKIE];
  const payload = token ? verifyVaultToken(token) : null;

  if (!payload || payload.userId !== req.user!.id) {
    return next(new AppError("Vault is locked", 403, "VAULT_LOCKED"));
  }

  const [user] = await db
    .select({ vaultPinUpdatedAt: users.vaultPinUpdatedAt })
    .from(users)
    .where(eq(users.id, req.user!.id))
    .limit(1);

  const currentPv = user?.vaultPinUpdatedAt?.getTime() ?? 0;
  if (payload.pv !== currentPv) {
    // The PIN changed since this cookie was issued — same trick as share
    // links: bumping vaultPinUpdatedAt invalidates every proof in flight.
    return next(new AppError("Vault is locked", 403, "VAULT_LOCKED"));
  }

  setVaultTokenCookie(_res, signVaultToken({ typ: "vault", userId: req.user!.id, pv: currentPv }));
  next();
}

/**
 * Guards `GET /memories` and `GET /collections`: those routes already
 * expose an isVaulted query toggle (mirroring the existing isArchived/
 * inTrash pattern) so the vault page can reuse the normal list endpoints
 * rather than needing its own. This is what stops that toggle from working
 * for anyone who hasn't actually unlocked the vault.
 *
 * A no-op when isVaulted isn't requested — every other caller of these
 * routes is unaffected.
 */
export function requireVaultUnlockedForQuery(req: Request, res: Response, next: NextFunction) {
  const query = req.query as unknown as { isVaulted?: boolean };
  if (query.isVaulted !== true) return next();
  return requireVaultUnlocked(req, res, next);
}

/**
 * Guards `PATCH /memories/:id` and `PATCH /collections/:id`: vaulting
 * something (isVaulted: true) is always allowed — hiding your own content
 * is never dangerous. Removing it from the vault (isVaulted: false) is the
 * one direction that needs proof of the PIN, since it's the direction that
 * makes something visible again.
 */
export function requireUnlockToUnvault(req: Request, res: Response, next: NextFunction) {
  if (req.body?.isVaulted !== false) return next();
  return requireVaultUnlocked(req, res, next);
}
