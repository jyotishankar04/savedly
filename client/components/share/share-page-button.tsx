"use client";

import { useSyncExternalStore } from "react";
import { ShareSheet } from "@/components/ui/share-sheet";

const noop = () => () => {};
// The page's own address, without any query string; empty on the server.
const pageUrl = () => window.location.origin + window.location.pathname;

/** A Share button for a public page (a shared link, a blog post): the share sheet for the page you are on. */
export function SharePageButton({ title, className }: { title: string; className?: string }) {
  const url = useSyncExternalStore(noop, pageUrl, () => "");
  return (
    <span className={className}>
      <ShareSheet url={url} title={title} variant="message" />
    </span>
  );
}
