"use client";

import { motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon as CheckIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { AskFragment, SearchFragment, VaultFragment, SHELL } from "@/components/marketing/landing/feature-fragments";
import { LibraryGraph } from "@/components/marketing/landing/library-graph";
import { PROVIDER_LABEL, ROLE_LABEL, type AiProvider, type AiRole } from "@/lib/ai-settings";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Every landing section shares this vertical rhythm. */
export const SECTION = "bg-background px-5 py-16 sm:px-6 md:py-24";
/** The tinted surface a demo sits on; whatever is inside stays flat. */
const PANEL = "rounded-3xl bg-foreground/[0.035] ring-1 ring-foreground/8";

const PROVIDERS: AiProvider[] = ["openai", "anthropic", "google", "groq", "openrouter"];
const ROLES: AiRole[] = ["fast", "reasoning", "vision", "embeddings"];

function ProviderPicker() {
  return (
    <div className={cn(SHELL, "max-w-xs p-2")}>
      <ul className="space-y-1">
        {PROVIDERS.map((p) => {
          const selected = p === "openrouter";
          return (
            <li
              key={p}
              className={cn(
                "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm",
                selected ? "bg-primary/10 font-medium text-foreground ring-1 ring-primary/30" : "text-foreground/80",
              )}
            >
              {PROVIDER_LABEL[p]}
              {selected && <HugeiconsIcon icon={CheckIcon} className="h-4 w-4 text-primary" strokeWidth={2.5} />}
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-foreground/8 px-2 pt-3 pb-1">
        {ROLES.map((r) => (
          <span key={r} className="rounded-full bg-foreground/5 px-2.5 py-1 text-xs text-muted-foreground">
            {ROLE_LABEL[r]}
          </span>
        ))}
      </div>
    </div>
  );
}

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={reduce ? { duration: 0 } : { duration: 0.9, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-end">
      <h2 className="text-3xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-5xl">{title}</h2>
      <p className="max-w-md text-lg leading-relaxed text-pretty text-muted-foreground lg:justify-self-end">{body}</p>
    </div>
  );
}

/** A demo on its panel, with a short title and one line above it. */
function DemoPanel({ title, body, note, children, delay }: { title: string; body: string; note?: string; children: React.ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay} className={cn(PANEL, "flex min-w-0 flex-col p-5 sm:p-8")}>
      <h3 className="text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
      <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">{body}</p>
      {note && <p className="mt-2 text-sm font-medium text-primary">{note}</p>}
      <div className="mt-8 flex flex-1 items-center justify-center">{children}</div>
    </Reveal>
  );
}

const MORE: { title: string; body: string }[] = [
  { title: "Whatever it is, it goes in", body: "Links, videos, notes, images, documents and voice memos. One box reads all of it." },
  { title: "Plays well with your calendar", body: "When a save mentions a date, push the event straight to Google Calendar or Outlook." },
  { title: "Wherever you already are", body: "The web dashboard and bulk import work today. The browser extension is on the way." },
  { title: "What you've actually been keeping", body: "An activity heatmap, your top tags, and the categories the AI inferred from your library." },
];

export function FeatureRowsSection() {
  return (
    <>
      {/* Two ways to get something back, side by side. */}
      <section id="features" className={SECTION}>
        <div className="mx-auto max-w-6xl">
          <SectionHead
            title="Two ways back to anything."
            body="Ask a question and get an answer you can check, or search with whatever you remember. Both read the same library."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DemoPanel title="Ask, with receipts" body="Answers are written from your own saves, and every one lists the memories it came from.">
              <AskFragment />
            </DemoPanel>
            <DemoPanel delay={0.12} title="Search both ways" body="The exact word or just the gist. Results found either way are ranked together.">
              <SearchFragment />
            </DemoPanel>
          </div>
        </div>
      </section>

      {/* The library as one wide band. */}
      <section className={SECTION}>
        <div className="mx-auto max-w-6xl">
          <SectionHead
            title="Your library has a shape."
            body="Saves connect by collection and by meaning. Nothing you keep sits alone, and the graph shows you what it sits next to."
          />
          <Reveal className={cn(PANEL, "mt-12 p-5 sm:p-8 lg:p-10")}>
            <p className="mb-6 hidden text-sm font-medium text-primary sm:block">Hover a save or a collection to see what it connects to.</p>
            <LibraryGraph />
          </Reveal>
        </div>
      </section>

      {/* Two promises about control, as a pair. */}
      <section className={SECTION}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-2">
          <DemoPanel
            title="A real lock, not a toggle"
            body="Anything in the vault disappears from search, the graph and sharing until you enter your PIN. It's PIN-protected, not encrypted."
            note="Live: switch tabs, then come back."
          >
            <VaultFragment />
          </DemoPanel>
          <DemoPanel
            delay={0.12}
            title="Your AI, your key"
            body="Connect OpenAI, Anthropic, Google Gemini, Groq or OpenRouter and pick a model for each job. You pay your provider directly."
          >
            <ProviderPicker />
          </DemoPanel>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <h2 className="text-3xl leading-[1.08] font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">And the rest of it.</h2>
          <dl className="divide-y divide-foreground/10 border-y border-foreground/10">
            {MORE.map((item) => (
              <div key={item.title} className="grid gap-1 py-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt className="font-medium text-foreground">{item.title}</dt>
                <dd className="text-muted-foreground">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

export default FeatureRowsSection;
