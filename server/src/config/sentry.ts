import * as Sentry from "@sentry/node";
import { env } from "./env";

// Error tracking. Off unless SENTRY_DSN is set, so a self-hosted install
// reports nothing to anyone unless its operator points it at their own
// Sentry project.
//
// What is sent is kept to what's needed to fix a bug: the error, its stack,
// the route, and the user's id. Request bodies, cookies, headers and query
// strings are removed, because they carry what people save and their
// session.

export const sentryEnabled = !!env.SENTRY_DSN;

if (sentryEnabled) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: process.env.APP_VERSION || undefined,
    // Nothing that carries what people save or who they are. beforeSend
    // below removes the same things again, in case a default changes.
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
    // Errors only. No performance tracing: it needs the SDK loaded before
    // every other module, and the request log already has timings.
    tracesSampleRate: 0,
    // No trail of earlier log lines and outgoing requests attached to each
    // error: those lines and URLs can hold what a user saved or searched for.
    maxBreadcrumbs: 0,
    beforeSend(event) {
      // The request itself is dropped whole: its URL holds ids and search
      // text. The route pattern (error-handler.ts) says where it happened.
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

// The same message, with no error behind it, at most once in this long.
// A provider outage logs one line per AI step; one report says it all.
const MESSAGE_QUIET_MS = 5 * 60_000;
const lastSent = new Map<string, number>();

/**
 * Reports one error-level log line. Called by the logger for every
 * `logger.error(...)`, so workers, background jobs and request failures are
 * all covered without each call site knowing about Sentry.
 */
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
