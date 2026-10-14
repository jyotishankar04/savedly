import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { HeroReveal } from "@/components/marketing/motion/hero-reveal";
import { Reveal, RevealList } from "@/components/marketing/motion/reveal";
import { ReadingProgress } from "@/components/marketing/motion/reading-progress";
import { PostBody } from "@/components/blog/post-body";
import { formatPostDate, getPublishedPost, getPublishedPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site-url";
import { BLOG_AUTHORS, blogAuthor } from "@/lib/blog-authors";
import { coverLoads } from "@/lib/blog-cover";

// One post. Read on the server, so its text, title and preview image are in
// the page itself. A draft, or an address that never existed, is "not found".

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Post not found · Savedly" };

  const description = post.excerpt ?? undefined;
  return {
    title: `${post.title} · Savedly`,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: [blogAuthor(post.authorName).name],
      tags: post.tags,
      // With no cover, the site's own preview image is used.
      ...(post.coverImageUrl ? { images: [{ url: post.coverImageUrl }] } : {}),
    },
    twitter: { card: "summary_large_image", title: post.title, description, ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}) },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const { posts } = await getPublishedPosts({ limit: 4 });
  const more = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const author = blogAuthor(post.authorName);
  // A cover that won't load is left out rather than shown as a broken image.
  const cover = post.coverImageUrl && (await coverLoads(post.coverImageUrl)) ? post.coverImageUrl : null;

  // What search engines read to show the post as an article.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.coverImageUrl ?? undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    author: blogAuthor(post.authorName).name === BLOG_AUTHORS[0].name ? { "@type": "Organization", name: "Savedly" } : { "@type": "Person", name: blogAuthor(post.authorName).name },
    publisher: { "@type": "Organization", name: "Savedly", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
      {/* "<" is escaped so a title can never close the script tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Navbar />
      <ReadingProgress />

      <main className="flex-1 px-5 pt-32 pb-20 sm:px-8 md:pt-40 md:pb-28">
        <article className="mx-auto max-w-[44rem]">
          <Link href="/blog" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            ← All posts
          </Link>

          <HeroReveal className="mt-8">
            {post.tags.length > 0 && <p className="text-sm font-medium text-primary">{post.tags.join(" · ")}</p>}
            <h1 className="mt-3 font-serif text-[clamp(2.2rem,5vw,3.5rem)] font-medium leading-[1.06] tracking-[-0.03em] text-balance text-foreground">{post.title}</h1>
            {post.excerpt && <p className="mt-5 text-xl leading-relaxed text-pretty text-muted-foreground">{post.excerpt}</p>}
            <div className="mt-7 flex items-center gap-3">
              {author.avatar && (
                // eslint-disable-next-line @next/next/no-img-element -- a small local picture
                <img src={author.avatar} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover ring-1 ring-foreground/10" />
              )}
              <div className="text-sm leading-snug">
                <p>
                  <span className="font-medium text-foreground">{author.name}</span>
                  {author.role && <span className="text-muted-foreground">, {author.role}</span>}
                </p>
                <p className="text-muted-foreground">
                  <time dateTime={post.publishedAt ?? undefined}>{formatPostDate(post.publishedAt)}</time>
                  <span className="mx-2" aria-hidden>
                    ·
                  </span>
                  {post.readingMinutes} min read
                </p>
              </div>
            </div>
          </HeroReveal>

          <Reveal delay={0.4}>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element -- an admin-supplied image from any host
            <img src={cover} alt="" className="mt-10 aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-foreground/10" />
          )}

          <PostBody markdown={post.content} className="mt-10" />
          </Reveal>
        </article>

        {more.length > 0 && (
          <aside className="mx-auto mt-20 max-w-6xl border-t border-foreground/15 pt-12" aria-label="More posts">
            <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] text-foreground">More from the blog</h2>
            <RevealList className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3" gap={0.08}>
              {more.map((p) => (
                <Link key={p.id} href={`/blog/${p.slug}`} className="group block focus-visible:outline-none">
                  <h3 className="font-serif text-xl font-medium leading-snug tracking-[-0.015em] text-balance text-foreground underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-foreground/30 group-focus-visible:decoration-foreground/30">
                    {p.title}
                  </h3>
                  {p.excerpt && <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-muted-foreground">{p.excerpt}</p>}
                  <p className="mt-3 text-sm text-muted-foreground">{formatPostDate(p.publishedAt)}</p>
                </Link>
              ))}
            </RevealList>
          </aside>
        )}
      </main>

      <MainFooter />
    </div>
  );
}
