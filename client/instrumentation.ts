import type { Instrumentation } from "next";
import { SENTRY_DSN, sentryOptions } from "@/lib/sentry-options";

// The website's own server (page rendering). The API reports separately
// (server/src/config/sentry.ts).
export async function register() {
  if (!SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init(sentryOptions);
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  // Path only: the query string can hold a search or a share token.
  Sentry.captureRequestError(error, { ...request, path: request.path.split("?")[0], headers: {} }, context);
};
