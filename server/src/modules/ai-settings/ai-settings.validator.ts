import { validate } from "../../shared/middlewares/validate";
import {
  assignRoleSchema,
  createCredentialSchema,
  credentialIdParamsSchema,
  roleParamsSchema,
  testConnectionSchema,
  updateCredentialSchema,
} from "./ai-settings.schema";

export const validateCreateCredential = validate(createCredentialSchema);
export const validateUpdateCredential = validate(updateCredentialSchema);
export const validateCredentialIdParams = validate(credentialIdParamsSchema, "params");
export const validateRoleParams = validate(roleParamsSchema, "params");
export const validateAssignRole = validate(assignRoleSchema);
export const validateTestConnection = validate(testConnectionSchema);
