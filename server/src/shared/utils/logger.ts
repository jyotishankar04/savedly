import pino from "pino";
import { env } from "../../config/env";
import { reportLoggedError } from "../../config/sentry";

export const logger = pino({
  level: env.LOG_LEVEL,
  hooks: {
    // Every error-level line also goes to error tracking (config/sentry.ts),
    // which does nothing unless it is configured.
    logMethod(args, method, level) {
      if (level >= 50) {
        const [first, second] = args as unknown[];
        const fields = first && typeof first === "object" ? (first as Record<string, unknown>) : {};
        const message = typeof first === "string" ? first : typeof second === "string" ? second : "";
        try {
          reportLoggedError(first instanceof Error ? { err: first } : fields, message);
        } catch {
          // Reporting must never break logging.
        }
      }
      method.apply(this, args);
    },
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
        }
      : undefined,
});
