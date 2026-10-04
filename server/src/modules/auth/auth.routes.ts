import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { oauthRateLimiter, passwordAuthRateLimiter, refreshRateLimiter } from "../../shared/middlewares/rate-limit";
import { AuthController } from "./auth.controller";
import { validateLogin, validateRegister } from "./auth.validator";

const router = Router();

router.get("/providers", AuthController.providers);
router.get("/google", oauthRateLimiter, AuthController.initiateGoogle);
router.get("/google/callback", oauthRateLimiter, AuthController.googleCallback);
router.get("/github", oauthRateLimiter, AuthController.initiateGithub);
router.get("/github/callback", oauthRateLimiter, AuthController.githubCallback);
router.post("/register", passwordAuthRateLimiter, validateRegister, AuthController.register);
router.post("/login", passwordAuthRateLimiter, validateLogin, AuthController.login);
router.post("/refresh", refreshRateLimiter, AuthController.refresh);
router.post("/logout", authenticate, AuthController.logout);
router.get("/me", authenticate, AuthController.me);

export default router;
