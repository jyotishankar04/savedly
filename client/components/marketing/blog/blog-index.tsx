"use client";

import { useMemo } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { RssIcon as Rss } from "@hugeicons/core-free-icons";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";
import { Reveal } from "@/components/marketing/motion/reveal";
import { BlogGrid, type BlogPost } from "@/components/arc/blocks/blog-grid/blog-grid";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import type { BlogPostSummary } from "@/lib/blog";
import { DISCORD_URL } from "@/lib/open-source";
import { blogAuthor } from "@/lib/blog-authors";

// The blog's index. The opening line rises in (GSAP); the posts are Arc's
// blog grid (a featured post, a topic filter with a gliding highlight, cards
// and pages, all Motion), each card linking to its own article page.
//
// Arc gives a post one category, so a post's first tag is its category, and
// the filter offers those, most used first. Cover images that don't load are
// dropped on the server (app/(marketing)/blog/page.tsx), since the grid shows
// a picture as it is, and a post without one shows the site's share card.

/** The Savedly share card (app/opengraph-image.png). */
const FALLBACK_COVER = "/opengraph-image.png";

function toGridPost(post: BlogPostSummary): BlogPost {
  return {
    id: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? "",
    category: post.tags[0] ?? "Notes",
    date: (post.publishedAt ?? post.updatedAt).slice(0, 10),
    readTime: post.readingMinutes,
    author: blogAuthor(post.authorName),
    // No cover, or one that won't load: the site's own share card, so no card is left half empty.
    image: { src: post.coverImageUrl ?? FALLBACK_COVER, alt: "" },
  };
}

export function BlogIndex({ posts }: { posts: BlogPostSummary[] }) {
  const gridPosts = useMemo(() => posts.map(toGridPost), [posts]);
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of gridPosts) counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  }, [gridPosts]);

  return (
    <>
      <HeroReveal className="flex flex-col items-center px-5 pt-40 pb-6 text-center sm:px-8 md:pt-48">
        <h1 className="text-[clamp(2.75rem,7vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.045em] text-balance text-foreground">Notes from building Savedly</h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
          How it works, what changed, and what we learned along the way, written by the people making it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
          <a href="/blog/feed.xml" className="inline-flex items-center gap-1.5 font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
            <HugeiconsIcon icon={Rss} strokeWidth={2} className="h-4 w-4" />
            Follow with RSS
          </a>
          <Link href="/changelog" className="font-medium text-muted-foreground transition-colors hover:text-foreground">
            Or see what shipped
          </Link>
        </div>
      </HeroReveal>

      {posts.length === 0 ? (
        <div className="px-5 py-20 sm:px-8">
          <EmptyState
            title="The first post is on its way"
            description="Until then, the changelog has everything that has shipped, and How it works explains what happens to what you save."
            action={
              <Link href="/how-it-works" className="text-sm font-medium text-foreground underline underline-offset-4">
                How it works
              </Link>
            }
          />
        </div>
      ) : (
        <Reveal delay={0.4}>
          <BlogGrid title="All posts" description="Pick a topic to narrow them down." posts={gridPosts} categories={categories} getHref={(post) => `/blog/${post.id}`} />
        </Reveal>
      )}

      {/* Where to hear about the next one */}
      <Reveal className="flex flex-col items-center gap-3 px-5 pt-8 pb-24 text-center sm:px-8 md:pb-32">
        <p className="text-[clamp(1.5rem,3vw,2rem)] font-medium tracking-[-0.03em] text-balance text-foreground">Get the next post when it&apos;s out</p>
        <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">Add the RSS feed to your reader, or join the Discord to talk about them.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <a href="/blog/feed.xml" className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <HugeiconsIcon icon={Rss} strokeWidth={2} className="h-4 w-4" />
            RSS feed
          </a>
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-full px-6 text-[15px] font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5">
            Join the Discord
          </a>
        </div>
      </Reveal>
    </>
  );
}
