"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon as Prev, ArrowRight01Icon as Next } from "@hugeicons/core-free-icons";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { GITHUB_URL } from "@/lib/open-source";
import { cn } from "@/lib/utils";

// One saved item, followed from the moment someone presses Save to the
// moment they find it again. Every step is a real stage of the pipeline
// (server/src/modules/ai/ingestion/graph.ts, then search and Ask), in the
// order it happens, with the file that does it. One example runs through
// all of them: the sourdough article from the rest of the site.

const EASE = [0.16, 1, 0.3, 1] as const;
const STEP_MS = 6500;
const CODE = `${GITHUB_URL}/tree/main/server/src/modules`;

function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full max-w-[380px] rounded-2xl bg-card p-5 shadow-xl shadow-black/[0.07] ring-1 ring-foreground/[0.07]", className)}>{children}</div>;
}
const Chip = ({ children, on }: { children: ReactNode; on?: boolean }) => (
  <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{children}</span>
);
const Line = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-foreground/[0.07] py-2 last:border-0">
    <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
    <span className="min-w-0 truncate text-right text-[12.5px] font-medium text-foreground">{children}</span>
  </div>
);

const STEPS: { name: string; title: string; body: string; note: string; code: string; path: string; picture: ReactNode }[] = [
  {
    name: "Save",
    title: "You save it, and carry on",
    body: "Paste a link, drop a file or type a note. It is stored straight away, so it's in your library before any AI has touched it. The reading happens in the background.",
    note: "Saves wait in a queue and are read four at a time. A single save goes ahead of a large import.",
    code: "ai/ingestion/queue.ts",
    path: "/ai/ingestion",
    picture: (
      <Surface>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 ring-1 ring-primary/40">
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground">breadnotes.example/sourdough-hydration</span>
          <span className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">Save</span>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
          <span className="text-[12.5px] font-medium text-foreground">Saved</span>
          <span className="text-[11px] text-muted-foreground">Reading it now…</span>
        </div>
      </Surface>
    ),
  },
  {
    name: "Read",
    title: "It's read, whatever it is",
    body: "A link is fetched and its article text pulled out. An image has its text read and is described. A PDF or document has its text extracted. A note is kept exactly as you typed it.",
    note: "Each kind of save has its own reader, so the steps after this one all work on plain text.",
    code: "ai/ingestion/nodes/parse-web-content.ts",
    path: "/ai/ingestion/nodes",
    picture: (
      <Surface>
        <div className="flex flex-wrap gap-1.5">
          <Chip on>Link</Chip>
          <Chip>Image</Chip>
          <Chip>PDF</Chip>
          <Chip>Note</Chip>
        </div>
        <p className="mt-3 rounded-xl bg-muted/60 p-3 text-[12px] leading-relaxed text-muted-foreground">
          Hydration is the weight of water divided by the weight of flour. A 70% hydration dough uses 700 g of water for every 1 kg of flour…
        </p>
      </Surface>
    ),
  },
  {
    name: "Understand",
    title: "It works out what this is",
    body: "The AI decides what kind of thing you saved and why you probably saved it, then writes a title, a short summary and a few tags. That's what lets you recognize it a year later without opening it.",
    note: "What you save is treated as material to read, never as instructions. A page can't tell the AI what to do.",
    code: "ai/ingestion/nodes/generate-ai-insights.ts",
    path: "/ai/ingestion/nodes",
    picture: (
      <Surface>
        <p className="text-[14px] font-semibold text-foreground">Sourdough hydration, explained</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">How much water to use for the weight of flour, and why beginners should start at 65 to 70 percent.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip on>baking</Chip>
          <Chip on>sourdough</Chip>
          <Chip on>hydration</Chip>
        </div>
      </Surface>
    ),
  },
  {
    name: "File",
    title: "It's filed by what it's about",
    body: "It goes into a collection on the same subject. If none fits, a new one is suggested with a name and an icon. It's filed by subject, not by format, so a recipe link and a recipe note end up together.",
    note: "You can rename, move or undo any of it. Your own collections are used first.",
    code: "ai/ingestion/nodes/organize-collection.ts",
    path: "/ai/ingestion/nodes",
    picture: (
      <Surface>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              ["Recipes", "🍞", 2, true],
              ["Travel", "✈️", 2, false],
              ["Health", "🦷", 2, false],
              ["Reading", "📚", 2, false],
            ] as const
          ).map(([name, emoji, count, on]) => (
            <div key={name} className={cn("rounded-xl p-3", on ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/60")}>
              <div className="flex items-start justify-between">
                <span className="text-xl font-semibold tabular-nums text-foreground">{count}</span>
                <span className="text-sm">{emoji}</span>
              </div>
              <p className="mt-1.5 text-[11.5px] font-medium text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
      </Surface>
    ),
  },
  {
    name: "Notice",
    title: "It notices dates and duplicates",
    body: "If what you saved mentions a date, you're offered a calendar event for it, in your own time zone. If the same link or note is already in your library, you're told, and you choose whether to keep both.",
    note: "The duplicate check is a plain lookup, not an AI guess.",
    code: "ai/ingestion/nodes/detect-event.ts",
    path: "/ai/ingestion/nodes",
    picture: (
      <Surface>
        <p className="text-[13px] font-semibold text-foreground">Duplicate detected</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">&ldquo;Sourdough hydration, explained&rdquo; is already in your library, saved on 13 Oct.</p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-[11.5px] font-semibold text-primary-foreground">Skip</span>
          <span className="rounded-full px-3 py-1 text-[11.5px] font-semibold text-foreground ring-1 ring-foreground/15">Add anyway</span>
        </div>
      </Surface>
    ),
  },
  {
    name: "Index",
    title: "It's indexed two ways",
    body: "The text is split into passages, and each passage is turned into a list of numbers that stands for its meaning. The words themselves are indexed too. Both are stored with your save.",
    note: "If this step fails, the save is still kept. It just can't be found by meaning until it's indexed again.",
    code: "ai/ingestion/nodes/semantic-chunker.ts",
    path: "/ai/ingestion/nodes",
    picture: (
      <Surface>
        <Line label="Passages">6</Line>
        <Line label="By meaning">
          <span className="font-mono text-[11px] text-muted-foreground">[0.021, -0.118, 0.094, …]</span>
        </Line>
        <Line label="By words">hydration · water · flour · dough</Line>
      </Surface>
    ),
  },
  {
    name: "Find",
    title: "You find it by what you remember",
    body: "A search runs twice, once for meaning and once for the exact words, and the two lists are merged into one. Ask goes a step further: it searches, writes an answer from what it found, checks the answer is supported, and lists its sources.",
    note: "Ask describes any change it's about to make and waits for your yes.",
    code: "ai/search/hybrid-search.ts",
    path: "/ai/search",
    picture: (
      <Surface>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 ring-1 ring-primary/40">
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">how much water for bread dough</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-foreground">Sourdough hydration, explained</p>
            <p className="truncate text-[11px] text-muted-foreground">breadnotes.example</p>
          </div>
          <Chip on>Matched by meaning</Chip>
        </div>
      </Surface>
    ),
  },
];

export function Journey() {
  const reduce = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [i, setI] = useState(0);
  // The steps take turns until someone picks one.
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (reduce || touched || !inView) return;
    const t = setTimeout(() => setI((n) => (n + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [i, reduce, touched, inView]);

  const go = (n: number) => {
    setTouched(true);
    setI((n + STEPS.length) % STEPS.length);
  };
  const step = STEPS[i];

  return (
    <div ref={ref}>
      {/* The seven stops. */}
      <ol className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Steps">
        {STEPS.map((s, n) => (
          <li key={s.name} className="shrink-0 grow basis-0">
            <button
              type="button"
              aria-current={n === i ? "step" : undefined}
              onClick={() => go(n)}
              className="group block w-full min-w-[84px] pt-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <span className={cn("block h-0.5 w-full rounded-full transition-colors duration-500", n <= i ? "bg-foreground" : "bg-foreground/15")} />
              <span className={cn("mt-3 block font-mono text-[11px] tabular-nums", n === i ? "text-primary" : "text-muted-foreground")}>{String(n + 1).padStart(2, "0")}</span>
              <span className={cn("mt-0.5 block text-sm font-medium transition-colors", n === i ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{s.name}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
        <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-3xl bg-muted/70 p-6 ring-1 ring-foreground/[0.05] sm:h-[360px] lg:h-[420px]" aria-hidden>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step.name}
              className="flex w-full justify-center"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
            >
              {step.picture}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Tall enough for the longest step, so the buttons below don't move as the text changes. */}
        <div className="flex min-h-[340px] flex-col lg:min-h-[400px]" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: reduce ? 0 : 0.35, ease: EASE }} className="flex-1">
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                Step {i + 1} of {STEPS.length}
              </p>
              <h3 className="mt-3 font-serif text-[clamp(1.6rem,2.8vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.02em] text-balance text-foreground">{step.title}</h3>
              <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">{step.body}</p>
              <p className="mt-4 border-l-2 border-primary/40 pl-4 text-[15px] leading-relaxed text-foreground">{step.note}</p>
              <a
                href={`${CODE}${step.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block font-mono text-xs text-muted-foreground underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
              >
                {step.code}
              </a>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(i - 1)}
              aria-label="Previous step"
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <HugeiconsIcon icon={Prev} strokeWidth={2} className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(i + 1)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {i === STEPS.length - 1 ? "Start again" : `Next: ${STEPS[i + 1].name}`}
              <HugeiconsIcon icon={Next} strokeWidth={2} className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
