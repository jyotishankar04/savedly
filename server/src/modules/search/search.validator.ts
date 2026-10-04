import { validate } from "../../shared/middlewares/validate";
import { advancedSearchInputSchema } from "./search.schema";

export const validateAdvancedSearch = validate(advancedSearchInputSchema, "query");
