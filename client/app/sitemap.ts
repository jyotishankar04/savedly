import { MetadataRoute } from 'next'
import { competitors } from '@/lib/data/comparisons'
import { SELF_HOSTED } from '@/lib/instance'
import { SITE_URL } from "@/lib/site-url";
import { getPublishedPosts } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (SELF_HOSTED) return []

  const baseUrl = SITE_URL;

  const staticRoutes = [
    '',
    '/about',
    '/features',
    '/how-it-works',
    '/pricing',
    '/changelog',
    '/blog',
    '/contact',
    '/community',
    '/help',
    '/privacy',
    '/terms',
    '/cookies',
    '/security',
    '/vs',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  const competitorRoutes = competitors.map((c) => ({
    url: `${baseUrl}/vs/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Every published post. Empty if the API can't be reached: the rest of the map still stands.
  const { posts } = await getPublishedPosts()
  const postRoutes = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...competitorRoutes, ...postRoutes]
}
