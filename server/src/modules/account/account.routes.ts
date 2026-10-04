import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { AccountController } from "./account.controller";
import { validateClearMemories, validateDeleteAccount } from "./account.validator";

// Mounted at /account by ../../routes/index.ts.
const router = Router();

router.post("/clear-memories", authenticate, validateClearMemories, AccountController.clearMemories);
router.post("/delete", authenticate, validateDeleteAccount, AccountController.deleteAccount);

export default router;
