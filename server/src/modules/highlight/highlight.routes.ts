import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { HighlightController } from "./highlight.controller";
import { validateCreateHighlight, validateHighlightId, validatePageQuery, validateUpdateHighlight } from "./highlight.validator";

const router = Router();

router.get("/page", authenticate, validatePageQuery, HighlightController.page);
router.get("/url-keys", authenticate, HighlightController.urlKeys);
router.post("/", authenticate, validateCreateHighlight, HighlightController.create);
router.patch("/:id", authenticate, validateHighlightId, validateUpdateHighlight, HighlightController.update);
router.delete("/:id", authenticate, validateHighlightId, HighlightController.remove);

export default router;
