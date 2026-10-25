import express, { Router } from "express";
import { FilesController } from "./files.controller";
import { MAX_FILE_SIZE_BYTES } from "../upload/api";

// Mounted at /files. No authenticate: uploads use the signed token from the presign endpoint (which
// needs a session); files are readable by anyone with the unguessable URL, like a public R2 bucket.
const router = Router();

router.put(
  "/upload/:key",
  express.raw({ type: () => true, limit: MAX_FILE_SIZE_BYTES }),
  FilesController.upload,
);
router.get("/:key", FilesController.serve);

export default router;
