"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon as Search, SparklesIcon as MeaningIcon } from "@hugeicons/core-free-icons";
// hugeicons' free set has no plain "literal text" glyph — lucide's Type ("A")
// fills that one gap; MEMORY_TYPE_ICONS below still drives every per-format
// icon, so this is the only icon in the file not from hugeicons.
import { Type as KeywordIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import type { MemoryType } from "@/types/memory";
import { useAuthCta } from "@/hooks/use-auth-cta";
import { cn } from "@/lib/utils";

// No live search here — same reasoning as the Ask section: an unauthenticated
// page load shouldn't be able to trigger a real query against the server.
// Two scripted scenarios instead, chosen to make an honest point about RRF
// merge (server/src/modules/ai/search/rrf.ts) rather than a contrived one:
// scenario B's second result shares zero significant words with the query —
// no synonym dressed up as an example — so "found by meaning, not letters"
// is demonstrably true here, not just asserted.
type Leg = "keyword" | "semantic";

interface Result {
  id: string;
  type: MemoryType;
  title: string;
  source: string;
  legs: Leg[];
}

interface Scenario {
  match: RegExp;
  chip: string;
  results: Result[];
}

const SCENARIOS: Scenario[] = [
  {
    match: /zfs|nas/i,
    chip: "zfs nas",
    results: [
      { id: "r1", type: "video", title: "Building a 6-bay ZFS NAS from scratch", source: "YouTube — Level1Techs", legs: ["keyword", "semantic"] },
      { id: "r2", type: "web", title: "Synology vs. self-built TrueNAS: a real cost breakdown", source: "eshop-nas-comparisons.dev", legs: ["semantic"] },
    ],
  },
  {
    match: /cable|tidy|cord/i,
    chip: "cheap way to keep cables tidy",
    results: [
      { id: "r3", type: "web", title: "10 cheap cable organizers under $15", source: "dealstack.blog", legs: ["keyword", "semantic"] },
      { id: "r4", type: "note", title: "used an old shoebox to route the power strip cords out of sight", source: "Note, saved Nov 2", legs: ["semantic"] },
    ],
  },
];

const FALLBACK_LABEL = "No match in this preview";

function matchScenario(text: string): Scenario | null {
  return SCENARIOS.find((s) => s.match.test(text)) ?? null;
}

const legMeta: Record<Leg, { label: string; render: () => React.ReactNode }> = {
  keyword: { label: "Keyword", render: () => <KeywordIcon className="h-3 w-3" /> },
  semantic: { label: "Meaning", render: () => <HugeiconsIcon icon={MeaningIcon} strokeWidth={2.25} className="h-3 w-3" /> },
};

const listVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring", damping: 28, stiffness: 220 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export function SearchSection() {
  const cta = useAuthCta();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Scenario | null>(null);
  const [missed, setMissed] = useState(false);

  function run(text: string) {
    setQuery(text);
    const scenario = matchScenario(text);
    setActive(scenario);
    setMissed(!scenario && text.trim().length > 0);
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-24 sm:py-32 md:px-12">
      <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Search however you think of it
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-balance text-foreground sm:text-5xl">
          The exact word, or just the gist.
        </h2>
        <p className="mt-4 text-base text-pretty text-muted-foreground">
          Type a keyword or describe what you half-remember — both get searched,
          and the results are ranked together, not shown as two separate lists.
        </p>
      </div>

      <InputGroup className="h-12 rounded-full px-1 shadow-sm">
        <InputGroupAddon className="pl-3">
          <HugeiconsIcon icon={Search} strokeWidth={2.25} className="h-4 w-4 text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(e) => run(e.target.value)}
          placeholder="Try “zfs nas” or “cheap way to keep cables tidy”…"
          aria-label="Search your memories"
          className="text-sm"
        />
      </InputGroup>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {SCENARIOS.map((s) => (
          <button
            key={s.chip}
            type="button"
            onClick={() => run(s.chip)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {s.chip}
          </button>
        ))}
      </div>

      <div className="mt-8 min-h-[168px]">
        <AnimatePresence mode="wait">
          {active && (
            <motion.ul
              key={active.chip}
              variants={listVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="flex flex-col gap-2"
            >
              {active.results.map((result) => (
                <motion.li
                  key={result.id}
                  variants={rowVariants}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <HugeiconsIcon icon={MEMORY_TYPE_ICONS[result.type]} strokeWidth={2.25} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{result.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{result.source}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {result.legs.map((leg) => (
                      <Badge key={leg} variant="secondary" className="gap-1 text-[10px]">
                        {legMeta[leg].render()}
                        {legMeta[leg].label}
                      </Badge>
                    ))}
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}

          {missed && (
            <motion.div
              key="missed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center"
            >
              <span className="text-sm font-medium text-foreground">{FALLBACK_LABEL}</span>
              <p className="max-w-xs text-xs text-muted-foreground">
                This preview only knows the two examples above. The real thing searches
                everything you&rsquo;ve saved.
              </p>
              <Link
                href={cta.href}
                className="text-xs font-medium text-primary hover:underline"
              >
                {cta.label} →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className={cn("mt-4 text-center text-xs text-muted-foreground", (active || missed) && "opacity-0")}>
        Items found both ways rank first — that&rsquo;s the whole trick.
      </p>
    </section>
  );
}

export default SearchSection;
