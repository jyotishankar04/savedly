import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { corsOptions } from "./config/cors";
import { env } from "./config/env";
import routes from "./routes/index";
import { errorHandler } from "./shared/errors/error-handler";
import { notFound } from "./shared/middlewares/not-found";
import { apiRateLimiter } from "./shared/middlewares/rate-limit";
import { requestLogger } from "./shared/middlewares/request-logger";

export function createApp() {
  const app = express();
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(requestLogger);

  // Security headers. This is a JSON API on its own origin, read by the web
  // app from another one, so responses must stay loadable cross-origin; the
  // default (same-origin) would block that.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  // The payment provider's webhook needs the raw body for signature verification — must be
  // registered with express.raw() on this exact path BEFORE the global
  // express.json() below, or json() will have already consumed the stream.
  app.use("/api/v1/billing/webhook", express.raw({ type: "application/json" }));

  // 5mb, not the 100kb default — a Netscape bookmark export with hundreds/
  // thousands of entries can be several hundred KB to a few MB (see
  // modules/import).
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());
  app.use(cors(corsOptions));
  app.use("/api/v1", apiRateLimiter, routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
