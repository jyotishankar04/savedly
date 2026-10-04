import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireAdmin } from "../../../shared/middlewares/require-admin";
import { AuditLogController } from "./audit-log.controller";
import { validateAuditLogQuery } from "./audit-log.validator";

// Mounted at /admin/audit-log by ../index.ts.
const router = Router();

router.get("/", authenticate, requireAdmin, validateAuditLogQuery, AuditLogController.auditLog);

export default router;
