import type { MetadataRoute } from "next";
import { competitors } from "@/lib/data/comparisons";
import { SELF_HOSTED } from "@/lib/instance";
import { SITE_URL } from "@/lib/site-url";
import { getPublishedPosts } from "@/lib/blog";
import { source } from "@/lib/source";

// A new blog post appears here within the hour.
export const revalidate = 3600;

/**
 * Every public page of savedly.app, for search engines (robots.ts points them
 * here). A self-hosted install is private and lists nothing.
 *
 * Only pages that exist and are meant to be found: not the app, sign-in,
 * onboarding, unsubscribe or share links (those are kept out in robots.ts or
 * by their own noindex), not /waitlist (pre-launch only) and not /c/ (an old
 * address that redirects to /s/).
 *
 * lastModified is given only where it's real (blog posts). A date that always
 * says "now" teaches search engines to ignore the field, real dates included.
 */
const MARKETING_PAGES: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/features", priority: 0.9 },
  { path: "/how-it-works", priority: 0.9 },
  { path: "/pricing", priority: 0.9 },
  { path: "/vs", priority: 0.8 },
  { path: "/blog", priority: 0.8 },
  { path: "/help", priority: 0.8 },
  { path: "/help/model-selection", priority: 0.6 },
  { path: "/changelog", priority: 0.7 },
  { path: "/about", priority: 0.7 },
  { path: "/contact", priority: 0.6 },
  { path: "/community", priority: 0.6 },
  { path: "/contribute", priority: 0.6 },
  { path: "/report", priority: 0.5 },
  { path: "/security", priority: 0.5 },
  { path: "/privacy", priority: 0.4 },
  { path: "/terms", priority: 0.4 },
  { path: "/cookies", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (SELF_HOSTED) return [];

  const base = SITE_URL.replace(/\/$/, "");
  const entry = (path: string, priority: number, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    priority,
    ...(lastModified ? { lastModified } : {}),
  });

  const pages = MARKETING_PAGES.map((page) => entry(page.path, page.priority));

  // One page per comparison in lib/data/comparisons.ts.
  const comparisons = competitors.map((c) => entry(`/vs/${c.slug}`, 0.7));

  // Every guide in content/docs, so a new one is listed as soon as it's added.
  const guides = source
    .getPages()
    .map((page) => page.url)
    .filter((url, i, all) => all.indexOf(url) === i)
    .map((url) => entry(url, url === "/help/docs" ? 0.7 : 0.6));

  // Every published post, dated by its last edit. Empty if the API can't be
  // reached: the rest of the map still stands.
  const { posts } = await getPublishedPosts();
  const blogPosts = posts.map((post) => entry(`/blog/${post.slug}`, 0.7, new Date(post.updatedAt)));

  return [...pages, ...comparisons, ...guides, ...blogPosts];
}
