import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The authenticated app and the API have nothing crawlable in them.
      //
      // /s/ is deliberately NOT disallowed: shared pages are noindex by
      // default via their own robots meta tag, which lets an owner opt a
      // single page in. A blanket rule here would override that and make
      // the per-share setting a lie.
      disallow: ["/api/", "/app/", "/admin/", "/auth/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
