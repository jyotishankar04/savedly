"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon as SearchIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { categoryById, entryHref, searchHelp } from "@/lib/help-content";

interface HelpSearchProps {
  /** "hero" is the large hub field; "compact" fits the sidebar. */
  size?: "hero" | "compact";
  autoFocusShortcut?: boolean;
}

export function HelpSearch({ size = "hero", autoFocusShortcut = true }: HelpSearchProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => searchHelp(query).slice(0, 8), [query]);
  const open = query.trim().length > 0;

  // "/" jumps to search from anywhere on the page, like most docs sites.
  useEffect(() => {
    if (!autoFocusShortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [autoFocusShortcut]);

  const hero = size === "hero";

  return (
    <div className="relative">
      <div className="relative">
        <HugeiconsIcon
          icon={SearchIcon}
          strokeWidth={2}
          className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none", hero ? "left-5 h-5 w-5" : "left-3 h-4 w-4")}
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="help-search-results"
          aria-label="Search the Help Center"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, hits.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            }
            if (e.key === "Enter" && hits[active]) window.location.assign(entryHref(hits[active].entry));
          }}
          placeholder={hero ? "Search the Help Center" : "Search help"}
          className={cn(
            "w-full border border-border bg-card text-foreground placeholder:text-muted-foreground/70 transition-colors [&::-webkit-search-cancel-button]:appearance-none",
            "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10",
            hero ? "rounded-2xl pl-14 pr-16 py-4 text-base" : "rounded-lg pl-9 pr-3 py-2 text-sm",
          )}
        />
        {hero && !open && (
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-mono text-muted-foreground pointer-events-none">
            /
          </kbd>
        )}
      </div>

      {open && (
        <div
          id="help-search-results"
          role="listbox"
          className={cn(
            "z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5",
            hero ? "absolute left-0 right-0" : "absolute left-0 right-0 min-w-72",
          )}
        >
          {hits.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              Nothing matched &ldquo;{query}&rdquo;. Try a shorter word, or{" "}
              <Link href="/contact" className="text-primary hover:underline">
                ask us directly
              </Link>
              .
            </p>
          ) : (
            <ScrollArea viewportClassName="max-h-[26rem]">
            <ul className="divide-y divide-border/60">
              {hits.map((hit, i) => (
                <li key={hit.entry.slug} role="option" aria-selected={i === active}>
                  <Link
                    href={entryHref(hit.entry)}
                    className={cn("block px-5 py-3.5 transition-colors", i === active ? "bg-muted/70" : "hover:bg-muted/50")}
                    onMouseEnter={() => setActive(i)}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">{hit.entry.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{categoryById(hit.entry.category)?.title}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground leading-snug">
                      {hit.step ? `${hit.step.title}: ${hit.step.body}`.slice(0, 120) + (hit.step.body.length > 100 ? "…" : "") : hit.entry.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
