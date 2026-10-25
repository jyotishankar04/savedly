import { z } from "zod";

// Digits-only, not strong-password shaped: a quick lock for your own device, not an account
// credential. 4-12 covers a phone PIN through a short passphrase.
const pinSchema = z.string().min(4, "PIN must be at least 4 characters").max(64);

export const setPinSchema = z.object({
  // Absent only on first setup; required to change an existing PIN, enforced in the service (it
  // depends on whether one exists).
  currentPin: pinSchema.optional(),
  newPin: pinSchema,
});

export const unlockVaultSchema = z.object({
  pin: pinSchema,
});

export type SetPinInput = z.infer<typeof setPinSchema>;
export type UnlockVaultInput = z.infer<typeof unlockVaultSchema>;
