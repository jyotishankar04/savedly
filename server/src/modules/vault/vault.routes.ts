import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { VaultController } from "./vault.controller";
import { validateSetPin, validateUnlockVault } from "./vault.validator";

const router = Router();

router.use(authenticate);

router.get("/status", VaultController.status);
router.post("/pin", validateSetPin, VaultController.setPin);
router.post("/unlock", validateUnlockVault, VaultController.unlock);
router.post("/lock", VaultController.lock);

export default router;
