import { validate } from "../../../shared/middlewares/validate";
import { auditLogQuerySchema } from "./audit-log.schema";

export const validateAuditLogQuery = validate(auditLogQuerySchema, "query");
