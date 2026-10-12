// Error tracking for the website. Off unless NEXT_PUBLIC_SENTRY_DSN was set
// when the site was built, so a self-hosted install reports nothing unless
// its operator builds with their own Sentry project.
//
// Errors only: no session replay and no performance tracing, both of which
// would record what people look at and type. What is sent is the error, its
// stack and the page's path.

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

/** A path without its query string, which can hold a search or a share token. */
function withoutQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut < 0 ? url : url.slice(0, cut);
}

type Crumb = { category?: string; data?: Record<string, unknown> | undefined };
type Event = { request?: { url?: string; headers?: unknown; cookies?: unknown; data?: unknown; query_string?: unknown }; user?: unknown };

export const sentryOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: 0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
    stackFrameVariables: false,
  },
  // The trail before an error keeps clicks and page changes, which say what
  // the person was doing. Console lines and request URLs are dropped: they
  // can hold saved content, search text and ids.
  beforeBreadcrumb<T extends Crumb>(crumb: T): T | null {
    if (crumb.category === "console" || crumb.category === "fetch" || crumb.category === "xhr") return null;
    if (crumb.category === "navigation" && crumb.data) {
      for (const key of ["from", "to"]) if (typeof crumb.data[key] === "string") crumb.data[key] = withoutQuery(crumb.data[key] as string);
    }
    return crumb;
  },
  beforeSend<T extends Event>(event: T): T {
    if (event.request) event.request = { url: event.request.url ? withoutQuery(event.request.url) : undefined };
    delete event.user;
    return event;
  },
};
