import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Real app screenshots, captured at 1440x900 (@1.5x) and 390x720 (@2x, the `-m-` files) against the running
 * app with a fictional demo library (public/landing/demo/*: invented sites,
 * titles and previews). One pair per screen so the frame follows the site's
 * light/dark toggle. Recapture both themes whenever the screen changes.
 */
export const SCREENS = {
  home: { path: "/app", alt: "SaveForLatter Home: a greeting, a search box, quick-save actions, and recently saved items with link previews" },
  ask: { path: "/app/ask", alt: "Ask: a question about vector search answered in plain English, with the two saved articles it used listed as sources" },
  search: { path: "/app/search", alt: "Search results for “vector search tuning”, ranked by meaning, with matching words highlighted" },
  memories: { path: "/app/memories", alt: "Memories: saved links, videos and screenshots grouped by day" },
} as const;

export type ScreenName = keyof typeof SCREENS;

/** Window chrome: three dots and a URL bar, the only frame the product needs. */
export function BrowserFrame({ url, className, children }: { url: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10", className)}>
      <div className="flex h-10 items-center gap-3 border-b border-foreground/8 px-4">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        </div>
        <div className="mx-auto flex h-6 max-w-sm flex-1 items-center justify-center rounded-md bg-foreground/5 px-3 font-mono text-[11px] text-muted-foreground">
          <span className="truncate">{url}</span>
        </div>
        <div className="w-10" aria-hidden />
      </div>
      {children}
    </div>
  );
}

/**
 * One screen in both themes, and at two sizes: below `sm` a 390px phone
 * capture replaces the 1440 desktop one, which would otherwise shrink to
 * about a quarter of its size and stop being readable.
 */
export function ProductShot({ name, priority = false, sizes = "(min-width: 1280px) 1200px, 100vw" }: { name: ScreenName; priority?: boolean; sizes?: string }) {
  const { alt } = SCREENS[name];
  return (
    <>
      <div className="relative aspect-[390/720] w-full bg-background sm:hidden">
        <Image src={`/landing/app-${name}-m-light.webp`} alt={alt} fill priority={priority} sizes="100vw" className="object-cover object-top dark:hidden" />
        <Image src={`/landing/app-${name}-m-dark.webp`} alt={alt} fill priority={priority} sizes="100vw" className="hidden object-cover object-top dark:block" />
      </div>
      <div className="relative hidden aspect-[1440/900] w-full bg-background sm:block">
        <Image src={`/landing/app-${name}-light.webp`} alt={alt} fill priority={priority} sizes={sizes} className="object-cover object-top dark:hidden" />
        <Image src={`/landing/app-${name}-dark.webp`} alt={alt} fill priority={priority} sizes={sizes} className="hidden object-cover object-top dark:block" />
      </div>
    </>
  );
}
