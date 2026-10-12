import { SELF_HOSTED } from "@/lib/instance";
import { cn } from "@/lib/utils";

// Savedly on Product Hunt. The images are drawn by Product Hunt (they carry
// the live upvote and review counts), in a light and a dark version.

const PRODUCT_ID = "1340226";
const POST_ID = "1275338";
const IMAGE = "https://api.producthunt.com/widgets/embed-image/v1";
const ALT = "Savedly - Save anything. Find it instantly. | Product Hunt";

const BADGES = {
  /** "Featured on Product Hunt" with the upvote count. Links to the launch. */
  featured: {
    href: "https://www.producthunt.com/products/savedly?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-savedly",
    image: (theme: string) => `${IMAGE}/featured.svg?post_id=${POST_ID}&theme=${theme}`,
    width: 250,
    height: 54,
    label: "Savedly on Product Hunt",
  },
  /** "Leave a review". Links straight to the review form. */
  review: {
    href: "https://www.producthunt.com/products/savedly/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_campaign=badge-savedly",
    image: (theme: string) => `${IMAGE}/product_review.svg?product_id=${PRODUCT_ID}&theme=${theme}`,
    width: 250,
    height: 54,
    label: "Review Savedly on Product Hunt",
  },
  /** A small "Follow" button. */
  follow: {
    href: "https://www.producthunt.com/products/savedly?utm_source=badge-follow&utm_medium=badge&utm_campaign=badge-savedly",
    image: (theme: string) => `${IMAGE}/follow.svg?product_id=${PRODUCT_ID}&theme=${theme}&size=small`,
    width: 86,
    height: 32,
    label: "Follow Savedly on Product Hunt",
  },
} as const;

export function ProductHuntBadge({
  variant,
  height,
  className,
}: {
  variant: keyof typeof BADGES;
  /** Rendered height in pixels; the width follows. Defaults to the badge's own size. */
  height?: number;
  className?: string;
}) {
  // A self-hosted install isn't the product being launched.
  if (SELF_HOSTED) return null;

  const badge = BADGES[variant];
  const h = height ?? badge.height;
  const w = Math.round((badge.width / badge.height) * h);
  const img = "h-full w-full";
  return (
    <a
      href={badge.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={badge.label}
      style={{ width: w, height: h }}
      className={cn(
        "inline-block shrink-0 rounded-lg transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className,
      )}
    >
      {/* Plain <img>: a remote SVG that Product Hunt redraws as the counts change. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={badge.image("light")} alt={ALT} width={w} height={h} loading="lazy" decoding="async" className={cn(img, "dark:hidden")} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={badge.image("dark")} alt="" aria-hidden width={w} height={h} loading="lazy" decoding="async" className={cn(img, "hidden dark:block")} />
    </a>
  );
}
