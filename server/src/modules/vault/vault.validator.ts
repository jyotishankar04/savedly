import { validate } from "../../shared/middlewares/validate";
import { setPinSchema, unlockVaultSchema } from "./vault.schema";

export const validateSetPin = validate(setPinSchema);
export const validateUnlockVault = validate(unlockVaultSchema);
