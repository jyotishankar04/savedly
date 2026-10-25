import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { AppError } from "../../shared/errors/app-error";
import { VAULT_TOKEN_COOKIE, setVaultTokenCookie } from "../../shared/utils/cookies";
import { signVaultToken, verifyVaultToken } from "../../shared/utils/jwt";

/**
 * Guards routes that read vaulted content; must run after `authenticate` (it trusts req.user). On
 * success it re-issues the cookie with a fresh 30-minute window, making the fixed TTL a sliding
 * "unlocked while active" session.
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
 * Guards `GET /memories` and `GET /collections`, which expose an isVaulted toggle so the vault page
 * can reuse them; this stops the toggle working for anyone who hasn't unlocked the vault. A no-op
 * when isVaulted isn't requested.
 */
export function requireVaultUnlockedForQuery(req: Request, res: Response, next: NextFunction) {
  const query = req.query as unknown as { isVaulted?: boolean };
  if (query.isVaulted !== true) return next();
  return requireVaultUnlocked(req, res, next);
}

/**
 * Guards `PATCH /memories/:id` and `/collections/:id`. Vaulting (isVaulted: true) is always
 * allowed; removing from the vault needs proof of the PIN, since that makes content visible again.
 */
export function requireUnlockToUnvault(req: Request, res: Response, next: NextFunction) {
  if (req.body?.isVaulted !== false) return next();
  return requireVaultUnlocked(req, res, next);
}
