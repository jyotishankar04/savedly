import * as Sentry from "@sentry/node";
import { env } from "./env";

// Error tracking, off unless SENTRY_DSN is set. Request bodies, cookies, headers and query strings
// are never sent.

export const sentryEnabled = !!env.SENTRY_DSN;

if (sentryEnabled) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: env.APP_VERSION || undefined,
    // Nothing that identifies people or holds what they save; beforeSend strips the same again.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    // server.ts logs unhandled rejections itself, and the logger reports them.
    integrations: (defaults) => defaults.filter((integration) => integration.name !== "OnUnhandledRejection"),
    // Errors only: tracing needs the SDK loaded first, and the request log has timings.
    tracesSampleRate: 0,
    // Breadcrumbs can hold what a user saved or searched for.
    maxBreadcrumbs: 0,
    beforeSend(event) {
      // The URL holds ids and search text; the route pattern (error-handler.ts) says where it happened.
      delete event.request;
      const route = event.extra?.route;
      event.transaction = typeof route === "string" ? route : undefined;
      if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
      delete event.breadcrumbs;
      return event;
    },
  });
}

/** Fields of a log line worth attaching: short plain values only, never objects (which may hold content). */
function plainFields(fields: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === "err" || key === "error") continue;
    if (typeof value === "number" || typeof value === "boolean") out[key] = value;
    else if (typeof value === "string") out[key] = value.length > 200 ? `${value.slice(0, 200)}…` : value;
  }
  return out;
}

// The same message with no error behind it is reported at most once per window: an outage logs a
// line per AI step.
const MESSAGE_QUIET_MS = 5 * 60_000;
const lastSent = new Map<string, number>();

/** Reports one error-level log line; the logger calls it for every logger.error. */
export function reportLoggedError(fields: Record<string, unknown>, message: string): void {
  if (!sentryEnabled) return;
  const err = fields.err ?? fields.error;
  const extra = plainFields(fields);
  const userId = typeof fields.userId === "string" ? fields.userId : undefined;

  Sentry.withScope((scope) => {
    if (userId) scope.setUser({ id: userId });
    scope.setExtras(extra);
    if (message) scope.setExtra("logMessage", message);
    if (err instanceof Error) {
      Sentry.captureException(err);
      return;
    }
    const now = Date.now();
    if (now - (lastSent.get(message) ?? 0) < MESSAGE_QUIET_MS) return;
    lastSent.set(message, now);
    if (lastSent.size > 500) for (const [m, at] of lastSent) if (now - at > MESSAGE_QUIET_MS) lastSent.delete(m);
    Sentry.captureMessage(message || "Error logged without a message", "error");
  });
}

/** Sends what is queued before the process exits. */
export async function flushSentry(): Promise<void> {
  if (sentryEnabled) await Sentry.close(2000).catch(() => {});
}
