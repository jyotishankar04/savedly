import { validate } from "../../shared/middlewares/validate";
import { createWhatsNewSchema, reorderWhatsNewSchema, updateWhatsNewSchema } from "./whats-new.schema";

export const validateCreateWhatsNew = validate(createWhatsNewSchema);
export const validateUpdateWhatsNew = validate(updateWhatsNewSchema);
export const validateReorderWhatsNew = validate(reorderWhatsNewSchema);
