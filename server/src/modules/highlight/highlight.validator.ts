import { validate } from "../../shared/middlewares/validate";
import { createHighlightSchema, highlightIdParamsSchema, pageQuerySchema, updateHighlightSchema } from "./highlight.schema";

export const validateCreateHighlight = validate(createHighlightSchema);
export const validateUpdateHighlight = validate(updateHighlightSchema);
export const validateHighlightId = validate(highlightIdParamsSchema, "params");
export const validatePageQuery = validate(pageQuerySchema, "query");
