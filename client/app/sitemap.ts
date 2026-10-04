import { MetadataRoute } from 'next'
import { competitors } from '@/lib/data/comparisons'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const staticRoutes = [
    '',
    '/about',
    '/features',
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

  return [...staticRoutes, ...competitorRoutes]
}
