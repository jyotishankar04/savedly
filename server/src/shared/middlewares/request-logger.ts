import { randomUUID } from "crypto";
import type { IncomingMessage } from "http";
import type { Request } from "express";
import pinoHttp from "pino-http";
import { logger } from "../utils/logger";

const REQUEST_ID_HEADER = "x-request-id";

// Express mutates `req.url` while descending mounted routers and only restores it when a handler
// calls `next()`; our controllers respond directly, so by the time this logs `req.url` is
// truncated. `originalUrl` is never mutated.
function originalUrl(req: IncomingMessage): string {
  return (req as Request).originalUrl ?? req.url ?? "";
}

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existingId = req.headers[REQUEST_ID_HEADER];
    const id = typeof existingId === "string" && existingId.length > 0 ? existingId : randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => `${req.method} ${originalUrl(req)} -> ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${originalUrl(req)} -> ${res.statusCode} (${err.message})`,
  customProps: (req) => ({ userId: (req as Request).user?.id }),
  serializers: {
    req(req: IncomingMessage & { id?: string | number }) {
      return { id: req.id, method: req.method, url: originalUrl(req), ip: req.socket?.remoteAddress };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});
