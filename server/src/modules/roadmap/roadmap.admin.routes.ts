import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { requireAdmin } from "../../shared/middlewares/require-admin";
import { RoadmapController } from "./roadmap.controller";
import { validateCreateRoadmapItem, validateReorderRoadmap, validateUpdateRoadmapItem } from "./roadmap.validator";

// Mounted at /admin/roadmap: Admin > Roadmap.
const router = Router();

router.get("/", authenticate, requireAdmin, RoadmapController.list);
router.post("/", authenticate, requireAdmin, validateCreateRoadmapItem, RoadmapController.create);
router.put("/order", authenticate, requireAdmin, validateReorderRoadmap, RoadmapController.reorder);
router.patch("/:id", authenticate, requireAdmin, validateUpdateRoadmapItem, RoadmapController.update);
router.delete("/:id", authenticate, requireAdmin, RoadmapController.remove);

export default router;
