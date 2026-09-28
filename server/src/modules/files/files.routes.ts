import express, { Router } from "express";
import { FilesController } from "./files.controller";
import { MAX_FILE_SIZE_BYTES } from "../upload/upload.constants";

// Mounted at /files by ../../routes/index.ts. No authenticate on either route:
// the upload is authorized by the signed token the presign endpoint (which
// does require a session) put in its URL, and a file is readable by anyone
// holding its unguessable URL — the same model as a public R2 bucket.
const router = Router();

router.put(
  "/upload/:key",
  express.raw({ type: () => true, limit: MAX_FILE_SIZE_BYTES }),
  FilesController.upload,
);
router.get("/:key", FilesController.serve);

export default router;
