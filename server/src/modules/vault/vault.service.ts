import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { AppError } from "../../shared/errors/app-error";
import { hashPassword, verifyPassword } from "../../shared/crypto/scrypt-password";
import type { SetPinInput } from "./vault.schema";
import { assertFeature } from "../plans/plans.service";

export interface VaultStatus {
  hasPin: boolean;
}

export async function getVaultStatus(userId: string): Promise<VaultStatus> {
  const [row] = await db.select({ vaultPinHash: users.vaultPinHash }).from(users).where(eq(users.id, userId)).limit(1);
  return { hasPin: Boolean(row?.vaultPinHash) };
}

/**
 * First-time setup needs no current PIN. Changing an existing one does —
 * otherwise anyone with an already-open session (not the vault itself,
 * just the app) could silently swap the PIN out from under the real owner.
 */
export async function setVaultPin(userId: string, input: SetPinInput): Promise<void> {
  const [row] = await db.select({ vaultPinHash: users.vaultPinHash }).from(users).where(eq(users.id, userId)).limit(1);

  if (row?.vaultPinHash) {
    const ok = await verifyPassword(input.currentPin ?? "", row.vaultPinHash);
    if (!ok) throw new AppError("Current PIN is incorrect", 401, "VAULT_PIN_INCORRECT");
  } else {
    // Setting up a vault needs the plan; changing an existing PIN never does.
    await assertFeature(userId, "vault");
  }

  const vaultPinHash = await hashPassword(input.newPin);
  // Bumping vaultPinUpdatedAt is what invalidates every unlock cookie
  // already issued — see verifyVaultToken's `pv` comparison.
  await db.update(users).set({ vaultPinHash, vaultPinUpdatedAt: new Date() }).where(eq(users.id, userId));
}

/** Returns the pv (vaultPinUpdatedAt epoch) to embed in the unlock token, or throws on a wrong PIN. */
export async function verifyVaultPin(userId: string, pin: string): Promise<number> {
  const [row] = await db
    .select({ vaultPinHash: users.vaultPinHash, vaultPinUpdatedAt: users.vaultPinUpdatedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row?.vaultPinHash) {
    throw new AppError("Set up a vault PIN first", 400, "VAULT_PIN_NOT_SET");
  }

  const ok = await verifyPassword(pin, row.vaultPinHash);
  if (!ok) throw new AppError("Incorrect PIN", 401, "VAULT_PIN_INCORRECT");

  return row.vaultPinUpdatedAt?.getTime() ?? 0;
}
