import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { AiSettingsController } from "./ai-settings.controller";
import {
  validateAssignRole,
  validateCreateCredential,
  validateCredentialIdParams,
  validateRoleParams,
  validateTestConnection,
  validateUpdateCredential,
} from "./ai-settings.validator";

const router = Router();

// Public: the live model catalog (prices, capabilities) — also used by the
// marketing site's model-selection help page, so no sign-in required.
router.get("/models", AiSettingsController.modelCatalog);

router.get("/credentials", authenticate, AiSettingsController.listCredentials);
router.get("/credentials/:id/models", authenticate, validateCredentialIdParams, AiSettingsController.credentialModels);
router.post("/credentials", authenticate, validateCreateCredential, AiSettingsController.createCredential);
router.patch("/credentials/:id", authenticate, validateCredentialIdParams, validateUpdateCredential, AiSettingsController.updateCredential);
router.delete("/credentials/:id", authenticate, validateCredentialIdParams, AiSettingsController.deleteCredential);

router.get("/roles", authenticate, AiSettingsController.listRoles);
router.put("/roles/:role", authenticate, validateRoleParams, validateAssignRole, AiSettingsController.assignRole);
router.delete("/roles/:role", authenticate, validateRoleParams, AiSettingsController.unassignRole);

router.post("/test", authenticate, validateTestConnection, AiSettingsController.testConnection);
router.get("/platform-defaults", authenticate, AiSettingsController.platformDefaults);

export default router;
