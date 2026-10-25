import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { SearchController } from "./search.controller";
import { validateAdvancedSearch } from "./search.validator";

const router = Router();

router.get("/advanced", authenticate, validateAdvancedSearch, SearchController.advancedSearch);

export default router;
