import type { ErrorRequestHandler, Request } from "express";
import { AppError } from "./app-error";
import { ApiResponse } from "../response/api-response";
import { logger } from "../utils/logger";

/** Which route failed and for whom: the route pattern, not the URL, so ids and search text stay out. */
function where(req: Request): { route: string; userId?: string } {
  return { route: `${req.method} ${req.baseUrl}${req.route?.path ?? ""}`, userId: req.user?.id };
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const log = req.log ?? logger;

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      log.error({ err: error, code: error.code, ...where(req) }, error.message);
    }
    return res
      .status(error.statusCode)
      .json(ApiResponse.error(error.code, error.message, error.details));
  }

  log.error({ err: error, ...where(req) }, "Unhandled error");
  return res
    .status(500)
    .json(ApiResponse.error("INTERNAL_ERROR", "Internal server error"));
};
