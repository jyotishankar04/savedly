import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { requireAdmin } from "../../../shared/middlewares/require-admin";
import { UsersController } from "./users.controller";
import {
  validateCreateUser,
  validateListUsers,
  validateGrantPlan,
  validateSetUserPassword,
  validateUpdateUserRoles,
  validateUpdateUserStatus,
} from "./users.validator";

// Mounted at /admin/users by ../index.ts.
const router = Router();

router.get("/", authenticate, requireAdmin, validateListUsers, UsersController.listUsers);
router.post("/", authenticate, requireAdmin, validateCreateUser, UsersController.createUser);
router.get("/:id", authenticate, requireAdmin, UsersController.getUser);
router.put("/:id/password", authenticate, requireAdmin, validateSetUserPassword, UsersController.setPassword);
router.patch("/:id/roles", authenticate, requireAdmin, validateUpdateUserRoles, UsersController.updateRoles);
router.patch("/:id/status", authenticate, requireAdmin, validateUpdateUserStatus, UsersController.updateStatus);
router.get("/:id/plan", authenticate, requireAdmin, UsersController.getPlan);
router.post("/:id/plan", authenticate, requireAdmin, validateGrantPlan, UsersController.grantPlan);
router.delete("/:id/plan", authenticate, requireAdmin, UsersController.removePlanGrant);
router.delete("/:id", authenticate, requireAdmin, UsersController.deleteUser);

export default router;
