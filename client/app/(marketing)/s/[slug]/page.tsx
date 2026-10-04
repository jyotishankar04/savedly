import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { SharedResourceView } from "@/components/share/shared-resource-view";
import { serverApiFetch } from "@/lib/server-api";
import type { ShareMeta, SharedResourcePayload } from "@/lib/shares";
import { ShareGate } from "./gate";

// Share settings change with no deploy, and caching "this is public" would
// be a privacy bug rather than merely a stale one.
export const dynamic = "force-dynamic";

/**
 * generateMetadata and the page body both need the share's shape. React's
 * `cache` dedupes them into one request per render.
 */
const loadMeta = cache(async (slug: string) => serverApiFetch<ShareMeta>(`/s/${slug}/meta`));

// Next 16: params is a Promise in both the page and generateMetadata.
type Props = { params: Promise<{ slug: string }> };

const NOINDEX = { index: false, follow: false } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadMeta(slug);

  // A gated link gets a generic title and no description. This is the whole
  // reason this page is a server component: a "use client" page can't emit
  // per-share robots directives, and without them a protected collection's
  // real name would end up in search results and Slack unfurls.
  if (!result.ok || result.data.mode === "gated") {
    return { title: "Shared with you · SaveForLatter", robots: NOINDEX };
  }

  const meta = result.data;
  const description =
    meta.description ??
    (meta.resourceType === "collection"
      ? `A collection of ${meta.memoryCount} saved ${meta.memoryCount === 1 ? "item" : "items"}.`
      : "A saved item, shared via SaveForLatter.");

  return {
    title: `${meta.title} · SaveForLatter`,
    description,
    // Indexing is opt-in per share and only ever honoured for a genuinely
    // public link — the API applies the same rule to the X-Robots-Tag it
    // sets, so the two can't disagree.
    robots: meta.allowSearchIndexing ? { index: true, follow: true } : NOINDEX,
    openGraph: {
      title: meta.title,
      description,
      type: "article",
      siteName: "SaveForLatter",
    },
  };
}

export default async function SharedPage({ params }: Props) {
  const { slug } = await params;
  const result = await loadMeta(slug);

  if (!result.ok) {
    // Anything other than 404 is a real failure (API down, bad gateway).
    if (result.status !== 404) {
      return <Shell><UnavailableNotice /></Shell>;
    }

    // A 404 here does NOT mean the link is dead. This request was
    // anonymous, and a share that is invite-only (link disabled, but
    // granted to specific people) answers anonymous callers with exactly
    // the same 404 as a slug that never existed — that indistinguishability
    // is the point.
    //
    // So don't call notFound(): hand off to the gate, which re-asks from
    // the browser with the visitor's session attached. A grantee gets their
    // content; everyone else gets "link not available". As a bonus the
    // server HTML is now byte-identical for both cases, so this page can't
    // be used to probe which slugs exist.
    return (
      <Shell>
        <ShareGate slug={slug} initialGate={null} stub={null} />
      </Shell>
    );
  }

  const meta = result.data;

  // Gated: render only a shell. The gate re-asks from the browser, where
  // the visitor's session actually exists, and an owner or grantee is let
  // straight through without ever seeing a prompt.
  if (meta.mode === "gated") {
    return (
      <Shell>
        <ShareGate slug={slug} initialGate={meta.gate} stub={meta.share} />
      </Shell>
    );
  }

  // Public: render the contents server-side, so shared links preview well
  // and an opted-in page is genuinely crawlable.
  const payload = await serverApiFetch<SharedResourcePayload>(`/s/${slug}`);
  if (!payload.ok) {
    // Raced with the owner unsharing between the two calls.
    if (payload.status === 404) notFound();
    return <Shell><UnavailableNotice /></Shell>;
  }

  return (
    <Shell>
      <SharedResourceView payload={payload.data} />
    </Shell>
  );
}

/**
 * (marketing) has no group layout by design — each page brings its own
 * chrome, the same way /c/[slug] did.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary/[0.03] via-background to-background font-sans text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pt-32 pb-20">{children}</main>
      <MainFooter />
    </div>
  );
}

/** Reachable when the API is unreachable — distinct from a 404, which is notFound(). */
function UnavailableNotice() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Couldn&apos;t load this link</h1>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
        Something went wrong reaching SaveForLatter. Try again in a moment.
      </p>
    </div>
  );
}
