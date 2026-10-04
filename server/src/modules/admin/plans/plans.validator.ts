import { validate } from "../../../shared/middlewares/validate";
import { createPlanSchema, updatePlanSchema } from "./plans.schema";

export const validateCreatePlan = validate(createPlanSchema);
export const validateUpdatePlan = validate(updatePlanSchema);
