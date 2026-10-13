import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { requireAdmin } from "../../shared/middlewares/require-admin";
import { BlogController } from "./blog.controller";
import { validateCreateBlogPost, validateUpdateBlogPost } from "./blog.validator";

// Mounted at /admin/blog.
const router = Router();

router.get("/", authenticate, requireAdmin, BlogController.list);
router.get("/:id", authenticate, requireAdmin, BlogController.get);
router.post("/", authenticate, requireAdmin, validateCreateBlogPost, BlogController.create);
router.patch("/:id", authenticate, requireAdmin, validateUpdateBlogPost, BlogController.update);
router.delete("/:id", authenticate, requireAdmin, BlogController.remove);

export default router;
