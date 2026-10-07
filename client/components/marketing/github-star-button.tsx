"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon, StarIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { GITHUB_CONFIGURED, GITHUB_URL } from "@/lib/open-source";

// "https://github.com/owner/repo" -> "owner/repo", for the public repo API.
const REPO = GITHUB_URL.replace(/^https:\/\/github\.com\//, "");

async function fetchStarCount(): Promise<number | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}`, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) return null;
  const body = (await res.json()) as { stargazers_count?: number };
  return typeof body.stargazers_count === "number" ? body.stargazers_count : null;
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
}

/** Live star count straight from GitHub. Null (hidden) while loading, on any failure, and at zero. */
export function useStarCount(): number | null {
  const { data } = useQuery({
    queryKey: ["github-stars", REPO],
    queryFn: fetchStarCount,
    staleTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return data && data > 0 ? data : null;
}

interface GithubStarButtonProps {
  /** "nav" is the compact bar pill; "hero" matches the hero's large buttons; "menu" fills the mobile sheet. */
  variant?: "nav" | "hero" | "menu";
  className?: string;
  /** Overrides the default "Star on GitHub" text for the non-nav variants. */
  label?: string;
}

/** Links to the repo, where the star itself happens; GitHub doesn't allow starring from another site. */
export function GithubStarButton({ variant = "nav", className, label }: GithubStarButtonProps) {
  const stars = useStarCount();
  if (!GITHUB_CONFIGURED) return null;

  const styles = {
    nav: "h-9 gap-2 rounded-full border border-foreground/20 bg-transparent px-3.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
    hero: "min-h-[40px] gap-2.5 rounded-full border border-border bg-background/70 px-6 py-4 text-[16px] font-medium text-foreground backdrop-blur-sm hover:bg-background/90 active:scale-[0.96]",
    menu: "h-10 w-full justify-center gap-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted",
  }[variant];

  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={stars ? `Star Savedly on GitHub (${stars.toLocaleString("en-US")} stars)` : "Star Savedly on GitHub"}
      className={cn(
        "group inline-flex items-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
        styles,
        className,
      )}
    >
      <HugeiconsIcon icon={GithubIcon} strokeWidth={2} className={variant === "hero" ? "h-5 w-5" : "h-4 w-4"} />
      <span>{variant === "nav" ? "Star" : (label ?? "Star on GitHub")}</span>
      {stars !== null && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
            // The bar's pill stays quiet: a hairline divider, no second filled shape.
            variant === "nav" ? "-mr-0.5 border-l border-foreground/20 pl-2 text-foreground/80" : "rounded-full bg-muted px-2 py-0.5 text-foreground/80",
            variant === "hero" && "bg-foreground/[0.07] text-[13px]",
          )}
        >
          <HugeiconsIcon icon={StarIcon} strokeWidth={2} className="h-3 w-3 transition-colors group-hover:text-amber-500" />
          {formatCount(stars)}
        </span>
      )}
    </a>
  );
}
