import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireAdmin } from "../../../shared/middlewares/require-admin";
import { UsersController } from "./users.controller";
import { validateListUsers, validateUpdateUserRoles, validateUpdateUserStatus } from "./users.validator";

// Mounted at /admin/users by ../index.ts.
const router = Router();

router.get("/", authenticate, requireAdmin, validateListUsers, UsersController.listUsers);
router.get("/:id", authenticate, requireAdmin, UsersController.getUser);
router.patch("/:id/roles", authenticate, requireAdmin, validateUpdateUserRoles, UsersController.updateRoles);
router.patch("/:id/status", authenticate, requireAdmin, validateUpdateUserStatus, UsersController.updateStatus);
router.delete("/:id", authenticate, requireAdmin, UsersController.deleteUser);

export default router;
