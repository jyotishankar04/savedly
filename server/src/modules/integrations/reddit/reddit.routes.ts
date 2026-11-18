import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { RedditController } from "./reddit.controller";

const router = Router();

router.get("/", authenticate, RedditController.status);
router.get("/connect", authenticate, RedditController.connect);
router.get("/callback", RedditController.callback);
router.post("/sync", authenticate, RedditController.sync);
router.delete("/", authenticate, RedditController.disconnect);

export default router;
