import { validate } from "../../shared/middlewares/validate";
import { createReportSchema } from "./report.schema";

export const validateCreateReport = validate(createReportSchema);
