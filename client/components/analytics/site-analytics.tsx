"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Page-view counts for the public site (Vercel Web Analytics: no cookies,
// no cross-site tracking, visitors aren't identified).
//
// Only the public pages are counted. Inside the app, addresses carry what a
// person is looking at (a memory's id, a search, a shared link's code), so
// nothing is sent from there, and query strings are dropped everywhere.

/** Signed-in areas, and public pages whose address names one person's content. */
const PRIVATE = /^\/(app|admin|auth|onboard|s|c|share-target|unsubscribe|report)(\/|$)/;

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    if (PRIVATE.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}

export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
