"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon as SearchIcon, SparklesIcon as SparklesIcon, TextFontIcon as TypeIcon, LockPasswordIcon as LockIcon, Mic01Icon as MicIcon } from "@hugeicons/core-free-icons";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

// Focused, coded slices of the real Ask and Search screens for the landing
// page's feature rows. Content matches the demo library used in the hero's
// app screenshots (public/landing/demo/*, fictional sites and titles).

// Flat on purpose: the panel behind already carries the elevation.
export const SHELL = "w-full min-w-0 rounded-2xl bg-background ring-1 ring-foreground/10";

function Thumb({ src }: { src: string }) {
  return (
    <span className="relative block h-9 w-16 shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/10">
      <Image src={src} alt="" fill sizes="64px" className="object-cover" />
    </span>
  );
}

const SOURCES = [
  { title: "HNSW index tuning in Postgres, explained", site: "pgnotes.io", thumb: "/landing/demo/hnsw.webp" },
  { title: "Why your RAG pipeline returns the wrong chunk", site: "fieldnotes.dev", thumb: "/landing/demo/rag.webp" },
];

export function AskFragment() {
  return (
    <div className={cn(SHELL, "max-w-md p-4 sm:p-5")}>
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          What did I save about vector search?
        </p>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <HugeiconsIcon icon={SearchIcon} className="h-3.5 w-3.5" strokeWidth={2} />
        Searched your memories for &ldquo;vector search&rdquo; · 3 found
      </p>

      <div className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-foreground">
        <p>You saved two pieces that cover this.</p>
        <p>
          <span className="font-medium">HNSW index tuning in Postgres</span> says raising <code className="rounded bg-foreground/[0.06] px-1 font-mono text-[12px]">m</code> and{" "}
          <code className="rounded bg-foreground/[0.06] px-1 font-mono text-[12px]">ef_construction</code> buys recall at the cost of build time.
        </p>
        <p>
          <span className="font-medium">Why your RAG pipeline returns the wrong chunk</span> blames chunk boundaries, not the embedding model.
        </p>
      </div>

      <div className="mt-4 border-t border-foreground/8 pt-3">
        <p className="text-xs font-medium text-muted-foreground">Sources</p>
        <ul className="mt-2 space-y-1.5">
          {SOURCES.map((s) => (
            <li key={s.title} className="flex items-center gap-3 rounded-xl p-1.5 ring-1 ring-foreground/8">
              <Thumb src={s.thumb} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-foreground">{s.title}</span>
                <span className="block text-xs text-muted-foreground">{s.site}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type Leg = "keyword" | "meaning";

const RESULTS: { title: React.ReactNode; meta: string; thumb: string; legs: Leg[] }[] = [
  {
    title: (
      <>
        HNSW index <mark className="rounded-sm bg-primary/15 px-0.5 text-inherit">tuning</mark> in Postgres, explained
      </>
    ),
    meta: "Website · pgnotes.io",
    thumb: "/landing/demo/hnsw.webp",
    legs: ["keyword", "meaning"],
  },
  { title: "Why your RAG pipeline returns the wrong chunk", meta: "Website · fieldnotes.dev", thumb: "/landing/demo/rag.webp", legs: ["meaning"] },
  { title: "Designing calm software", meta: "Video · vimeo.com", thumb: "/landing/demo/calm.webp", legs: ["meaning"] },
];

function LegBadge({ leg }: { leg: Leg }) {
  const icon = leg === "keyword" ? TypeIcon : SparklesIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        leg === "keyword" ? "bg-foreground/[0.06] text-foreground/80" : "bg-primary/10 text-primary",
      )}
    >
      <HugeiconsIcon icon={icon} className="h-3 w-3" strokeWidth={2} />
      {leg === "keyword" ? "Keyword" : "Meaning"}
    </span>
  );
}

export function SearchFragment() {
  return (
    <div className={cn(SHELL, "max-w-md p-3 sm:p-4")}>
      <div className="flex h-11 items-center gap-2.5 rounded-xl px-3.5 ring-1 ring-foreground/12">
        <HugeiconsIcon icon={SearchIcon} className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
        <span className="text-sm text-foreground">vector search tuning</span>
        <span className="ml-0.5 h-4 w-px animate-pulse bg-primary motion-reduce:animate-none" aria-hidden />
      </div>

      <div className="mt-3 flex gap-1.5">
        {["All", "Websites", "Videos", "Notes"].map((chip, i) => (
          <span
            key={chip}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              i === 0 ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "text-muted-foreground ring-1 ring-foreground/10",
            )}
          >
            {chip}
          </span>
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {RESULTS.map((r, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl p-2 ring-1 ring-foreground/8">
            <Thumb src={r.thumb} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-foreground">{r.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs text-muted-foreground">{r.meta}</span>
                {r.legs.map((leg) => (
                  <LegBadge key={leg} leg={leg} />
                ))}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const VAULT_ITEMS = [
  { title: "Q3 planning — reading list and goals", meta: "PDF · 12 pages", thumb: "/landing/demo/q3.webp" },
  { title: "Lisbon — 4 days, 3 neighbourhoods", meta: "Screenshot", thumb: "/landing/demo/lisbon.webp" },
  { title: "Voice memo: podcast episode ideas", meta: "Voice memo · 2:14", thumb: null },
];

/**
 * Live, with no backend: the same two browser events the real vault page
 * listens for. `blur` dims the contents the moment the window loses focus;
 * `visibilitychange` locks it outright when the tab is hidden. The PIN here
 * accepts any four digits, since there is nothing to check it against.
 */
export function VaultFragment() {
  const [dimmed, setDimmed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    const dim = () => setDimmed(true);
    const undim = () => setDimmed(false);
    const onVisibility = () => {
      if (document.hidden) setLocked(true);
    };
    window.addEventListener("blur", dim);
    window.addEventListener("focus", undim);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", dim);
      window.removeEventListener("focus", undim);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className={cn(SHELL, "max-w-md overflow-hidden")}>
      <div className="flex items-center justify-between border-b border-foreground/8 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <HugeiconsIcon icon={LockIcon} className="h-4 w-4 text-primary" strokeWidth={2} /> Vault
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", locked ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
          {locked ? "Locked" : "Unlocked"}
        </span>
      </div>
      <div className="relative p-3">
        <ul className={cn("space-y-1.5 transition-[filter,opacity] duration-200", dimmed && !locked && "opacity-50 blur-[4px]", locked && "invisible")}>
          {VAULT_ITEMS.map((item) => (
            <li key={item.title} className="flex items-center gap-3 rounded-xl p-2 ring-1 ring-foreground/8">
              {item.thumb ? (
                <Thumb src={item.thumb} />
              ) : (
                <span className="flex h-9 w-16 shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground">
                  <HugeiconsIcon icon={MicIcon} className="h-4 w-4" strokeWidth={2} />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-foreground">{item.title}</span>
                <span className="block text-xs text-muted-foreground">{item.meta}</span>
              </span>
            </li>
          ))}
        </ul>
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background px-4">
            <HugeiconsIcon icon={LockIcon} className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <p className="text-center text-sm text-muted-foreground">Enter any 4 digits to come back in</p>
            <InputOTP
              maxLength={4}
              value={pin}
              onChange={setPin}
              onComplete={() => {
                setLocked(false);
                setPin("");
              }}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        )}
      </div>
    </div>
  );
}
