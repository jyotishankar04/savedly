import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { formatPostDate, getPublishedPosts, type BlogPostSummary } from "@/lib/blog";

// The post list. Read on the server (lib/blog.ts), so the posts are in the
// page a search engine or a link preview sees. A new post shows within a
// minute of being published.

/** Who wrote it, when, and how long it takes: the line under a post's title. */
function Byline({ post }: { post: BlogPostSummary }) {
  return (
    <p className="text-sm text-muted-foreground">
      {formatPostDate(post.publishedAt)}
      <span className="mx-2" aria-hidden>
        ·
      </span>
      {post.readingMinutes} min read
      {post.authorName && (
        <>
          <span className="mx-2" aria-hidden>
            ·
          </span>
          {post.authorName}
        </>
      )}
    </p>
  );
}

function Cover({ post, className }: { post: BlogPostSummary; className?: string }) {
  if (!post.coverImageUrl) return null;
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- an admin-supplied image from any host */}
      <img src={post.coverImageUrl} alt="" loading="lazy" className="aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-foreground/10" />
    </div>
  );
}

export default async function BlogPage() {
  const { posts } = await getPublishedPosts();
  const [latest, ...rest] = posts;

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
      <Navbar />

      <main className="flex-1 px-5 pt-36 pb-20 sm:px-8 md:pt-44 md:pb-28">
        <div className="mx-auto max-w-6xl">
          <header className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-16">
            <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.04] tracking-[-0.03em] text-foreground">Blog</h1>
            <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground lg:justify-self-end">
              Notes from building Savedly: how it works, what changed, and what we learned along the way.
            </p>
          </header>

          {!latest ? (
            <div className="mt-16 border-t border-foreground/15 pt-16 text-center">
              <p className="font-serif text-2xl font-medium text-foreground">Nothing here yet</p>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                The first post is on its way. Until then, the{" "}
                <Link href="/changelog" className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
                  changelog
                </Link>{" "}
                has what&apos;s shipped, and{" "}
                <Link href="/how-it-works" className="font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
                  how it works
                </Link>{" "}
                explains what happens to what you save.
              </p>
            </div>
          ) : (
            <>
              {/* The newest post, large */}
              <article className="mt-14 border-t border-foreground/15 pt-12">
                <Link href={`/blog/${latest.slug}`} className="group grid gap-8 focus-visible:outline-none lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">
                  <Cover post={latest} className="lg:order-2" />
                  <div className={latest.coverImageUrl ? "" : "lg:col-span-2 lg:max-w-3xl"}>
                    <p className="text-sm font-medium text-primary">Latest</p>
                    <h2 className="mt-3 font-serif text-[clamp(1.9rem,3.6vw,3rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance text-foreground underline decoration-transparent underline-offset-[6px] transition-colors group-hover:decoration-foreground/30 group-focus-visible:decoration-foreground/30">
                      {latest.title}
                    </h2>
                    {latest.excerpt && <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">{latest.excerpt}</p>}
                    <div className="mt-5">
                      <Byline post={latest} />
                    </div>
                  </div>
                </Link>
              </article>

              {rest.length > 0 && (
                <div className="mt-16 grid gap-x-10 gap-y-14 border-t border-foreground/15 pt-12 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <article key={post.id}>
                      <Link href={`/blog/${post.slug}`} className="group block focus-visible:outline-none">
                        <Cover post={post} className="mb-5" />
                        <h2 className="font-serif text-[1.55rem] font-medium leading-[1.15] tracking-[-0.02em] text-balance text-foreground underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-foreground/30 group-focus-visible:decoration-foreground/30">
                          {post.title}
                        </h2>
                        {post.excerpt && <p className="mt-3 line-clamp-3 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>}
                        <div className="mt-4">
                          <Byline post={post} />
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <MainFooter />
    </div>
  );
}
