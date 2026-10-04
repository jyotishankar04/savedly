import { validate } from "../../../shared/middlewares/validate";
import { analyticsRangeQuerySchema } from "./analytics.schema";

export const validateAnalyticsRange = validate(analyticsRangeQuerySchema, "query");
