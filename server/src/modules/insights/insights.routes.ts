import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { InsightsController } from "./insights.controller";

const router = Router();

router.get("/", authenticate, InsightsController.get);

export default router;
