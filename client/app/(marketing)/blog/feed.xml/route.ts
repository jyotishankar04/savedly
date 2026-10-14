import { getPublishedPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site-url";
import { blogAuthor } from "@/lib/blog-authors";

// The blog as an RSS 2.0 feed, for anyone who follows it in a reader. Built
// from the same published posts as /blog, and refreshed as often (once a
// minute at most).
export const revalidate = 60;

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET() {
  const { posts } = await getPublishedPosts();
  const site = SITE_URL.replace(/\/$/, "");
  const items = posts
    .map((post) => {
      const url = `${site}/blog/${post.slug}`;
      return [
        "    <item>",
        `      <title>${escape(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        post.publishedAt ? `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : "",
        post.excerpt ? `      <description>${escape(post.excerpt)}</description>` : "",
        `      <dc:creator>${escape(blogAuthor(post.authorName).name)}</dc:creator>`,
        ...post.tags.map((tag) => `      <category>${escape(tag)}</category>`),
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Savedly blog</title>
    <link>${site}/blog</link>
    <description>Notes from building Savedly: how it works, what changed, and what we learned along the way.</description>
    <language>en</language>
    <atom:link href="${site}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
