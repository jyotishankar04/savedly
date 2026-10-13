import { Router } from "express";
import { BlogController } from "./blog.controller";

// Mounted at /blog. Public: the website reads it for every visitor, and only
// ever gets published posts.
const router = Router();

router.get("/", BlogController.published);
router.get("/:slug", BlogController.publishedOne);

export default router;
