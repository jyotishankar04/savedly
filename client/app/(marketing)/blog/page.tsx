import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import MainFooter from "@/components/marketing/landing/main-footer";
import { BlogIndex } from "@/components/marketing/blog/blog-index";
import { getPublishedPosts } from "@/lib/blog";
import { coverLoads } from "@/lib/blog-cover";

export const metadata: Metadata = {
  title: "Blog · Savedly",
  description: "Notes from building Savedly: how it works, what changed, and what we learned along the way.",
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/feed.xml" } },
};


// The post list. Read on the server (lib/blog.ts), so the posts are in the
// page a search engine or a link preview sees; filtering by topic and paging
// happen in the browser (components/marketing/blog/blog-index.tsx). A new
// post shows within a minute of being published.
export default async function BlogPage() {
  const { posts: published } = await getPublishedPosts();
  const posts = await Promise.all(published.map(async (post) => (post.coverImageUrl && !(await coverLoads(post.coverImageUrl)) ? { ...post, coverImageUrl: null } : post)));

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
      <Navbar />
      <main className="flex-1">
        <BlogIndex posts={posts} />
      </main>
      <MainFooter />
    </div>
  );
}
