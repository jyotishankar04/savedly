import { z } from "zod";

// Digits-only, not a strong-password shape: this is a quick-glance lock for
// content on your own device, not an account credential. 4–12 covers a
// phone-style PIN through a short memorable passphrase without pretending
// to be bcrypt-your-bank-password strength.
const pinSchema = z.string().min(4, "PIN must be at least 4 characters").max(64);

export const setPinSchema = z.object({
  // Absent only on first-ever setup — required to change an existing PIN,
  // enforced in the service (not here) since that depends on whether the
  // user already has one.
  currentPin: pinSchema.optional(),
  newPin: pinSchema,
});

export const unlockVaultSchema = z.object({
  pin: pinSchema,
});

export type SetPinInput = z.infer<typeof setPinSchema>;
export type UnlockVaultInput = z.infer<typeof unlockVaultSchema>;
