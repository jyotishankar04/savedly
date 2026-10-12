import { SELF_HOSTED } from "@/lib/instance";

// The site's own public address, for everything that has to be an absolute
// URL: link-preview images, the sitemap, robots.txt.
//
// Getting this wrong is silent and costly: previews on X, Slack and WhatsApp
// lose their image, and search engines are handed a sitemap of addresses
// they can't reach. So the hosted site never depends on a variable being set.

const HOSTED_URL = "https://savedly.app";

function withScheme(value: string): string {
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

export const SITE_URL: string = (
  // An explicit choice always wins (a custom domain, a preview build).
  process.env.NEXT_PUBLIC_SITE_URL ||
  // Vercel and Netlify each say what the production address is.
  (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? withScheme(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : "") ||
  process.env.URL ||
  // A production build of the hosted site, wherever it is built.
  (process.env.NODE_ENV === "production" && !SELF_HOSTED ? HOSTED_URL : "") ||
  "http://localhost:3000"
).replace(/\/+$/, "");
