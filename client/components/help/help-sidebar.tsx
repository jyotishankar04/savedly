"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { entriesByCategory, entryHref } from "@/lib/help-content";
import { HelpSearch } from "@/components/help/help-search";
import { ScrollArea } from "@/components/ui/scroll-area";

function Nav({ pathname }: { pathname: string }) {
  const currentRef = useRef<HTMLAnchorElement>(null);
  // Landing on a guide far down the list (or using prev/next) brings the
  // current link into view; "nearest" leaves the scroll alone when it's visible.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="Help topics" className="space-y-6">
      {entriesByCategory().map(({ category, entries }) => (
        <div key={category.id}>
          <p className="px-2 text-xs font-semibold text-foreground">{category.title}</p>
          <ul className="mt-1.5 space-y-0.5">
            {entries.map((entry) => {
              const href = entryHref(entry);
              const current = pathname === href;
              return (
                <li key={entry.slug}>
                  <Link
                    ref={current ? currentRef : undefined}
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-2 py-1.5 text-sm transition-colors",
                      current ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    {entry.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function HelpSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: sticky column */}
      <aside className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-28">
          <HelpSearch size="compact" />
          {/* Search stays outside the scroll area so its results list can overlay it. */}
          <ScrollArea className="mt-6 h-[calc(100vh-13rem)]" viewportClassName="pr-3 pb-8">
            <Nav pathname={pathname} />
          </ScrollArea>
        </div>
      </aside>

      {/* Mobile: collapsed disclosure so the article stays first */}
      {/* Keyed by path: the sidebar now persists across guides, so this remounts closed after a link is chosen. */}
      <details key={pathname} className="lg:hidden rounded-xl border border-border bg-card group">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium flex items-center justify-between">
          All help topics
          <span className="text-muted-foreground text-xs group-open:hidden">Show</span>
          <span className="text-muted-foreground text-xs hidden group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-border px-4 py-4 space-y-5">
          <HelpSearch size="compact" autoFocusShortcut={false} />
          <Nav pathname={pathname} />
        </div>
      </details>
    </>
  );
}
