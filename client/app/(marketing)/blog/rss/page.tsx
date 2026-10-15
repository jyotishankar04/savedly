import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { getPublishedPosts } from "@/lib/blog";
import { blogAuthor } from "@/lib/blog-authors";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Follow the blog with RSS · Savedly",
  description: "Add the Savedly blog to your feed reader and get each new post as it's published.",
  alternates: { canonical: "/blog/rss", types: { "application/rss+xml": "/blog/feed.xml" } },
};

// A new post shows here within a minute, like on /blog.
export const revalidate = 60;

const READERS = ["Feedly", "Inoreader", "NetNewsWire", "Reeder"];

/**
 * What a person gets from "RSS feed" in the menu or on the blog: what a feed
 * is, its address to copy, and the latest posts. The feed itself
 * (/blog/feed.xml) is plain XML for feed readers; opening that in a browser
 * shows only code.
 */
export default async function BlogRssPage() {
  const { posts } = await getPublishedPosts();
  const feedUrl = `${SITE_URL.replace(/\/$/, "")}/blog/feed.xml`;
  const latest = posts.slice(0, 8);

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
      <Navbar />
      <main className="flex-1 px-5 pt-40 pb-24 sm:px-8 md:pt-48 md:pb-32">
        <div className="mx-auto max-w-2xl">
          <HeroReveal as="header">
            <h1 className="text-[clamp(2.5rem,6vw,4rem)] font-medium leading-[1.04] tracking-[-0.045em] text-balance">Follow the blog with RSS</h1>
            <p data-hero-after className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
              An RSS feed brings each new post to the reader app you already use, as soon as it&apos;s published. No email, no account with us.
            </p>
          </HeroReveal>

          <section aria-labelledby="feed-address" className="mt-10 rounded-3xl bg-primary/[0.06] p-5 ring-1 ring-primary/15 sm:p-6">
            <h2 id="feed-address" className="text-sm font-medium text-foreground">The feed&apos;s address</h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-background px-4 py-2.5 font-mono text-[13px] text-foreground ring-1 ring-foreground/10">{feedUrl}</code>
              <CopyButton value={feedUrl} label="Copy address" />
            </div>
            <ol className="mt-5 space-y-2 text-[15px] leading-relaxed text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">1.</span> Copy the address above.
              </li>
              <li>
                <span className="font-medium text-foreground">2.</span> In your reader ({READERS.join(", ")}, or any other), choose add or subscribe, and paste it.
              </li>
              <li>
                <span className="font-medium text-foreground">3.</span> New posts appear there on their own.
              </li>
            </ol>
          </section>

          <section aria-labelledby="latest" className="mt-16">
            <h2 id="latest" className="text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              What&apos;s in it
            </h2>
            {latest.length === 0 ? (
              <p className="mt-4 text-[15px] text-muted-foreground">No posts yet. The first one will show up in your reader the moment it&apos;s out.</p>
            ) : (
              <ol className="mt-2 divide-y divide-foreground/10">
                {latest.map((post) => {
                  const author = blogAuthor(post.authorName);
                  return (
                    <li key={post.slug} className="py-5">
                      <Link href={`/blog/${post.slug}`} className="text-lg font-medium tracking-[-0.01em] text-foreground transition-colors duration-300 hover:text-primary">
                        {post.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {post.publishedAt && new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {post.publishedAt && " · "}
                        {author.name}
                      </p>
                      {post.excerpt && <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-muted-foreground">{post.excerpt}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
            <Link href="/blog" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
              Read the blog
            </Link>
          </section>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
