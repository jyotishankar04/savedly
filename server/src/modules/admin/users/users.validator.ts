import { validate } from "../../../shared/middlewares/validate";
import {
  createUserSchema,
  listUsersQuerySchema,
  setUserPasswordSchema,
  updateUserRolesSchema,
  updateUserStatusSchema,
} from "./users.schema";

export const validateListUsers = validate(listUsersQuerySchema, "query");
export const validateUpdateUserRoles = validate(updateUserRolesSchema);
export const validateUpdateUserStatus = validate(updateUserStatusSchema);
export const validateCreateUser = validate(createUserSchema);
export const validateSetUserPassword = validate(setUserPasswordSchema);
