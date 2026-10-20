import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { optionalAuthenticate } from "../../shared/middlewares/optional-authenticate";
import { RoadmapController } from "./roadmap.controller";
import { validateRoadmapVote } from "./roadmap.validator";

// Mounted at /roadmap. Anyone can see the counts (with their own votes when
// signed in); voting needs an account, one vote per person per item.
const router = Router();

router.get("/votes", optionalAuthenticate, RoadmapController.votes);
router.post("/votes/:slug", authenticate, validateRoadmapVote, RoadmapController.vote);
router.delete("/votes/:slug", authenticate, validateRoadmapVote, RoadmapController.unvote);

export default router;
