import { Router } from "express";
import { BlogController } from "./blog.controller";

// Mounted at /blog. Public; only published posts are returned.
const router = Router();

router.get("/", BlogController.published);
router.get("/:slug", BlogController.publishedOne);

export default router;
