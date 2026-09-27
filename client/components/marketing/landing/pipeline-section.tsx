"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon, FolderOpenIcon, Link01Icon as Link2Icon, Search01Icon as SearchIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

// One example save, shown at each stage of the real ingestion graph
// (server/src/modules/ai/ingestion/graph.ts): parse -> detect type +
// classify -> AI insights -> organize collection -> chunk, embed, upsert.
// The link, title and numbers are the demo library's, not real data.
const STAGES = [
  { name: "Saved", does: "You paste a link. That's the only step that's yours." },
  { name: "Read", does: "The page is fetched and its text pulled out. Audio is transcribed, images are read, PDFs extracted." },
  { name: "Understood", does: "It gets a real title, a short summary and tags, written by the AI you connected." },
  { name: "Filed", does: "It joins a related collection, or starts a new one if nothing fits." },
  { name: "Findable", does: "It's indexed by meaning, so the words you remember later still find it." },
] as const;

const CARD = "rounded-2xl bg-background p-3.5 ring-1 ring-foreground/10";

function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "primary" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "primary" ? "bg-primary/10 text-primary" : "bg-foreground/[0.06] text-foreground/75",
      )}
    >
      {children}
    </span>
  );
}

function StageCard({ stage }: { stage: number }) {
  if (stage === 0) {
    return (
      <div className={CARD}>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <HugeiconsIcon icon={Link2Icon} className="h-3.5 w-3.5" strokeWidth={2} /> Quick Capture
        </p>
        <p className="mt-2 font-mono text-[12px] break-all text-foreground">fieldnotes.dev/post/rag-chunks</p>
      </div>
    );
  }
  if (stage === 1) {
    return (
      <div className={CARD}>
        <Chip>Article</Chip>
        {/* The article's own opening, as pulled out of the page. */}
        <p className="mt-2.5 line-clamp-4 text-[11.5px] leading-snug text-muted-foreground [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
          Most retrieval failures get blamed on the embedding model. In practice the model is rarely the problem: the chunk it was handed
          never contained the answer, because the boundary cut the paragraph in half.
        </p>
        <p className="mt-2.5 text-[11px] text-muted-foreground">2,140 words extracted</p>
      </div>
    );
  }
  const title = "Why your RAG pipeline returns the wrong chunk";
  if (stage === 2) {
    return (
      <div className={CARD}>
        <span className="relative block aspect-[1200/630] overflow-hidden rounded-lg ring-1 ring-foreground/10">
          <Image src="/landing/demo/rag.webp" alt="" fill sizes="220px" className="object-cover" />
        </span>
        <p className="mt-2.5 text-[13px] leading-snug font-medium text-foreground">{title}</p>
        <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">Most misses come from chunk boundaries, not the model.</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Chip>rag</Chip>
          <Chip>retrieval</Chip>
        </div>
      </div>
    );
  }
  if (stage === 3) {
    // Only what this step adds: where it went, beside what was already there.
    return (
      <div className={CARD}>
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
          <HugeiconsIcon icon={FolderOpenIcon} className="h-4 w-4 text-primary" strokeWidth={2} /> AI engineering
        </p>
        <ul className="mt-2.5 space-y-1.5 text-[11.5px] leading-snug">
          <li className="rounded-md bg-primary/[0.07] px-2 py-1.5 font-medium text-foreground">{title}</li>
          <li className="px-2 text-muted-foreground">HNSW index tuning in Postgres</li>
          <li className="px-2 text-muted-foreground">+ 12 more</li>
        </ul>
      </div>
    );
  }
  // Findable: words the visitor never saved still reach it.
  return (
    <div className={CARD}>
      <p className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] text-foreground ring-1 ring-foreground/12">
        <HugeiconsIcon icon={SearchIcon} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
        why does my chatbot cite the wrong doc
      </p>
      <p className="mt-2.5 text-[11px] text-muted-foreground">Top result, matched by meaning</p>
      <p className="mt-1 text-[12.5px] leading-snug font-medium text-foreground">{title}</p>
    </div>
  );
}

export function PipelineSection() {
  const reduce = useReducedMotion();
  return (
    <section id="how-it-works" className="bg-background px-5 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <h2 className="text-3xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-5xl">
            You paste a link. The rest happens on its own.
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-pretty text-muted-foreground lg:justify-self-end">
            Every save runs through the same steps, whatever it is. Here is one article on the way in.
          </p>
        </div>

        <ol className="relative mt-16 grid gap-10 md:grid-cols-5 md:gap-4">
          {/* The track the save travels along: draws across once on view. */}
          <motion.span
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-20% 0px" }}
            transition={reduce ? { duration: 0 } : { duration: 1.4, ease: EASE }}
            className="absolute top-[11px] right-[10%] left-[10%] hidden h-px origin-left bg-primary/40 md:block"
          />
          {STAGES.map((stage, i) => (
            <motion.li
              key={stage.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20% 0px" }}
              transition={reduce ? { duration: 0 } : { duration: 0.7, ease: EASE, delay: 0.15 + i * 0.16 }}
              className="relative flex flex-col"
            >
              <div className="flex items-center gap-2.5 md:flex-col md:items-center md:text-center">
                <span
                  className={cn(
                    "relative z-10 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background",
                    i === STAGES.length - 1 ? "bg-primary text-primary-foreground" : "bg-foreground text-background",
                  )}
                >
                  <HugeiconsIcon icon={CheckIcon} className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <h3 className="font-medium text-foreground md:mt-3">{stage.name}</h3>
              </div>
              <p className="mt-2 text-[14px] leading-snug text-muted-foreground md:min-h-[5.5rem] md:text-center">{stage.does}</p>
              <div className="mt-4">
                <StageCard stage={i} />
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default PipelineSection;
