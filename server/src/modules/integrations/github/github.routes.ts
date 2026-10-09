import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate";
import { GithubController } from "./github.controller";

// Mounted at /github by ../index.ts: full path /api/v1/integrations/github/...
// The OAuth callback is mounted separately, under the sign-in callback's path
// (see githubStarsCallbackRouter), because that's the only place GitHub will
// redirect to for this OAuth app.
const router = Router();

router.get("/", authenticate, GithubController.status);
router.get("/connect", authenticate, GithubController.connect);
router.post("/sync", authenticate, GithubController.sync);
router.delete("/", authenticate, GithubController.disconnect);

export const githubStarsCallbackRouter = Router();
githubStarsCallbackRouter.get("/", GithubController.callback);

export default router;
