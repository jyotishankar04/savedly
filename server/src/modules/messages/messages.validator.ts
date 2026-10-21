import { validate } from "../../shared/middlewares/validate";
import { idParamsSchema, kindIdParamsSchema, listContactSchema, listReportsSchema, replySchema, updateContactSchema, updateReportSchema } from "./messages.schema";

export const validateListContact = validate(listContactSchema, "query");
export const validateListReports = validate(listReportsSchema, "query");
export const validateUpdateContact = validate(updateContactSchema);
export const validateUpdateReport = validate(updateReportSchema);
export const validateId = validate(idParamsSchema, "params");
export const validateReply = validate(replySchema);
export const validateKindId = validate(kindIdParamsSchema, "params");
