"use client";

import { useState } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

/**
 * A saved page's site icon in a list row, or `fallback` (the memory type's
 * icon) when there's none or it doesn't load: a site that's gone, one that
 * blocks hotlinking, an address no browser page can load from.
 */
export function SiteIcon({ src, fallback }: { src: string | null | undefined; fallback: IconSvgElement }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return <HugeiconsIcon icon={fallback} strokeWidth={2} className="h-4.5 w-4.5" />;
  // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain favicon
  return <img src={src} alt="" onError={() => setFailedSrc(src)} className="h-5 w-5 rounded-sm object-contain" />;
}
