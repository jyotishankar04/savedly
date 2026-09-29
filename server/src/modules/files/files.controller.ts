import { readFile } from "node:fs/promises";
import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error";
import { ApiResponse } from "../../shared/response/api-response";
import { STORAGE_KEY_PATTERN, getStorage, localMetaPath, verifyLocalUploadToken } from "../../shared/storage";
import { ALLOWED_MIME_TYPES } from "../upload/upload.constants";

// Only reachable with the local-disk storage driver (self-hosted default) —
// with R2/S3 the client uploads to and reads from the bucket directly.
async function requireLocalStorage() {
  const storage = await getStorage();
  if (storage.kind !== "local") throw new AppError("Not found", 404, "NOT_FOUND");
  return storage;
}

export class FilesController {
  /** PUT /files/upload/:key?e=&s= — the local-disk stand-in for a presigned S3 PUT. */
  static async upload(req: Request, res: Response) {
    const storage = await requireLocalStorage();
    const key = req.params.key as string;
    const mimeType = (req.headers["content-type"] ?? "").split(";")[0].trim();
    const expiresAt = Number(req.query.e);
    const signature = String(req.query.s ?? "");

    if (!STORAGE_KEY_PATTERN.test(key) || !ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new AppError("Invalid upload", 400, "INVALID_UPLOAD");
    }
    if (!verifyLocalUploadToken(key, mimeType, expiresAt, signature)) {
      throw new AppError("Upload link is invalid or expired", 403, "UPLOAD_FORBIDDEN");
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError("Empty upload", 400, "INVALID_UPLOAD");
    }

    await storage.write(key, req.body, mimeType);
    res.status(200).json(ApiResponse.success({ key }));
  }

  /** GET /files/:key — public by unguessable key, like a public R2 bucket. */
  static async serve(req: Request, res: Response) {
    const storage = await requireLocalStorage();
    const key = req.params.key as string;
    if (!STORAGE_KEY_PATTERN.test(key)) throw new AppError("Not found", 404, "NOT_FOUND");

    let body: Buffer;
    let mimeType = "application/octet-stream";
    try {
      body = await storage.read(key);
      mimeType = JSON.parse(await readFile(localMetaPath(key), "utf8")).mimeType ?? mimeType;
    } catch {
      throw new AppError("Not found", 404, "NOT_FOUND");
    }

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).send(body);
  }
}
