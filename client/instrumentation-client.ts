import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, sentryOptions } from "@/lib/sentry-options";

// Runs in the browser before the app becomes interactive. See
// lib/sentry-options.ts for what is and isn't sent.
if (SENTRY_DSN) {
  try {
    Sentry.init({
      ...sentryOptions,
      // Named explicitly so nothing extra (replay, tracing, feedback) is ever
      // switched on by a default.
      integrations: (defaults) => defaults.filter((i) => !["BrowserTracing", "Replay", "ReplayCanvas", "Feedback"].includes(i.name)),
    });
  } catch {
    // Error tracking must never stop the app from loading.
  }
}
