import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { ImportController } from "./import.controller";
import { validateImport, validateListImportItems } from "./import.validator";

// Mounted at /import by ../../routes/index.ts.
const router = Router();

router.post("/", authenticate, validateImport, ImportController.run);
router.get("/:batchId", authenticate, ImportController.getBatch);
router.get("/:batchId/items", authenticate, validateListImportItems, ImportController.listItems);

export default router;
