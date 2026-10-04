import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { SearchController } from "./search.controller";
import { validateAdvancedSearch } from "./search.validator";

const router = Router();

// GET /api/v1/search/advanced?query=vacation+AND+photos&dateFrom=...&dateTo=...
router.get("/advanced", authenticate, validateAdvancedSearch, SearchController.advancedSearch);

export default router;
