import { validate } from "../../shared/middlewares/validate";
import { clearMemoriesSchema, deleteAccountSchema } from "./account.schema";

export const validateClearMemories = validate(clearMemoriesSchema);
export const validateDeleteAccount = validate(deleteAccountSchema);
