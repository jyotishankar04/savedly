"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Streamdown } from "streamdown";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon as ChevronDownIcon, ArrowRight02Icon as SendIcon, StopIcon } from "@hugeicons/core-free-icons";
import { API_URL } from "@/lib/auth";
import { SkeletonSwap } from "@/components/interior/skeleton-swap";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { cn } from "@/lib/utils";

// The short questions, answered here, and one more row where a visitor can
// type their own. That row is answered by the server from the Help Center's
// guides (server/src/modules/help-assistant). Every written answer below is
// checked against the product: the vault is a PIN gate, not encryption; the
// extension isn't published yet; there is no native mobile app.

const EASE = [0.16, 1, 0.3, 1] as const;
const MAX_QUESTION = 300;
/** The grey lines shown while an answer is looked up, and the height of each. */
const SKELETON_LINES = 3;
const LINE_HEIGHT = 26;

interface Faq {
  question: string;
  answer: string;
}

const FAQS: Faq[] = [
  {
    question: "What can I save?",
    answer: "Links, notes, images and screenshots, PDFs and other documents, and videos. Each one is read, summarized and tagged when you save it.",
  },
  {
    question: "How does Savedly find things?",
    answer: "It understands what each saved item is about, so you can search with ordinary words. Exact words work too, and both kinds of match are ranked together.",
  },
  {
    question: "Is it open source? Can I self-host it?",
    answer: "Yes to both. The code is public under the AGPL-3.0 licence, and you can run your own copy with every feature, using your own AI key.",
  },
  {
    question: "Is there a free plan?",
    answer: "Yes. The Free plan has the essentials and some AI we supply each month, with no card required. Lite and Pro add more room, more AI and extras like the private vault.",
  },
  {
    question: "Is my vault encrypted?",
    answer: "No. It is protected by a PIN, not encrypted. It hides those items from every normal view, search and the assistant until you enter the PIN.",
  },
  {
    question: "Is there a mobile app or a browser extension?",
    answer: "There's no native mobile app; the site works in a phone's browser and can be added to your home screen. The browser extension is built but not yet published.",
  },
];

interface HelpAnswer {
  answer: string;
  answered: boolean;
  links: { label: string; href: string }[];
}

type AskState =
  | { status: "idle" }
  // `text` grows as the answer is written. Empty until the first words arrive.
  | { status: "writing"; question: string; text: string }
  | { status: "done"; question: string; reply: HelpAnswer; stopped?: boolean }
  | { status: "error"; question: string; message: string };

/** A reason we wrote ourselves and can show. Anything else (no network, a timeout) gets the general message. */
class HelpError extends Error {}

/**
 * Asks the question and calls `onText` with the answer so far, each time more
 * of it arrives. Resolves with the finished answer and its links.
 */
async function askHelp(question: string, signal: AbortSignal, onText: (soFar: string) => void): Promise<HelpAnswer> {
  const res = await fetch(`${API_URL}/help/ask`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({ question }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    if (res.status === 429) {
      throw new HelpError(body?.error?.code === "HELP_BUSY" ? (body.error.message ?? "") : "That's a lot of questions in a short time. Give it a minute and try again.");
    }
    throw new HelpError(body?.error?.code === "HELP_UNAVAILABLE" && body.error.message ? body.error.message : "");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let done: HelpAnswer | null = null;
  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    buffer += decoder.decode(value, { stream: true });
    // Events are separated by a blank line; the last piece may be half an event.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const raw of events) {
      const line = raw.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const event = JSON.parse(line.slice(6)) as { type: "delta"; text: string } | ({ type: "done" } & HelpAnswer) | { type: "error"; message?: string };
      if (event.type === "delta") {
        text += event.text;
        onText(text);
      } else if (event.type === "done") {
        done = { answer: event.answer, answered: event.answered, links: event.links };
      } else {
        throw new HelpError(event.message ?? "");
      }
    }
  }
  if (!done) throw new HelpError("");
  return done;
}

function AskRow() {
  const reduce = useReducedMotion();
  const [text, setText] = useState("");
  const [state, setState] = useState<AskState>({ status: "idle" });
  const request = useRef<AbortController | null>(null);
  const writing = state.status === "writing";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const question = text.trim();
    if (question.length < 3 || writing) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: "writing", question, text: "" });
    let soFar = "";
    try {
      const reply = await askHelp(question, controller.signal, (t) => {
        soFar = t;
        setState({ status: "writing", question, text: t });
      });
      setState({ status: "done", question, reply });
      setText("");
    } catch (err) {
      if (controller.signal.aborted) {
        // Stopped by the visitor: keep what was written so far, without links it never got.
        setState(soFar ? { status: "done", question, reply: { answer: soFar, answered: false, links: [] }, stopped: true } : { status: "idle" });
      } else {
        setState({ status: "error", question, message: err instanceof HelpError ? err.message : "" });
      }
    }
  }

  const answer = state.status === "writing" ? state.text : state.status === "done" ? state.reply.answer : "";

  // The answer's own height, so the box around it can grow as it is written.
  const answerBox = useRef<HTMLDivElement>(null);
  const [answerHeight, setAnswerHeight] = useState(0);
  const showing = state.status === "writing" || answer.length > 0;
  useEffect(() => {
    const el = answerBox.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setAnswerHeight(Math.ceil(el.getBoundingClientRect().height)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [showing]);

  return (
    <div className="border-b border-foreground/10">
      <form onSubmit={submit} className="flex items-center gap-4 py-4">
        <label htmlFor="faq-ask" className="sr-only">
          Ask your own question about Savedly
        </label>
        <input
          id="faq-ask"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_QUESTION}
          autoComplete="off"
          placeholder="Ask your own question…"
          className="min-w-0 flex-1 bg-transparent py-2 text-lg font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground/70 focus:outline-none"
        />
        {writing ? (
          // Its own `key`, and the click's default cancelled: without them React
          // reuses this button for Send, the same click turns it into a submit
          // button, and stopping an answer immediately asks the question again.
          <button
            key="stop"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              request.current?.abort();
            }}
            aria-label="Stop"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <HugeiconsIcon icon={StopIcon} strokeWidth={2.25} className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            key="send"
            type="submit"
            disabled={text.trim().length < 3}
            aria-label="Ask"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-25"
          >
            <HugeiconsIcon icon={SendIcon} strokeWidth={2.25} className="h-4 w-4" />
          </button>
        )}
      </form>

      {state.status !== "idle" && (
        <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="pb-6 pr-12">
          <p className="text-sm font-medium text-foreground">{state.question}</p>

          {(writing || answer) && (
            // Grey lines hold the answer's place while it is being looked up,
            // then give way to the text as it starts to arrive. The box keeps
            // growing with the answer, so nothing below it jumps.
            <SkeletonSwap ready={answer.length > 0} lines={SKELETON_LINES} lineHeight={LINE_HEIGHT} reserve={Math.max(SKELETON_LINES * LINE_HEIGHT, answerHeight)} label="Answer" className="mt-2 max-w-2xl">
              <div
                ref={answerBox}
                className="text-base leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_code]:text-foreground [&_li]:mt-1.5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
              >
                <Streamdown isAnimating={writing}>{answer}</Streamdown>
              </div>
            </SkeletonSwap>
          )}

          {state.status === "done" && (
            <>
              {state.reply.links.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {state.reply.links.map((link) => (
                    <Link key={link.href} href={link.href} className="rounded-full px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-muted">
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
              <p className="mt-3.5 text-xs text-muted-foreground/80">
                {state.stopped ? "Stopped. " : ""}Written by AI from our help guides. It can be wrong; for anything important, check the guide or write to{" "}
                <a href={SUPPORT_MAILTO} className="underline underline-offset-2 hover:text-foreground">
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </>
          )}

          {state.status === "error" && (
            <p role="alert" className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {state.message || "The help box isn't available right now."} You can also write to{" "}
              <a href={SUPPORT_MAILTO} className="text-foreground underline underline-offset-4">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

export function FaqSection() {
  const reduce = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="scroll-mt-24 bg-background px-5 py-20 font-sans antialiased sm:px-8 md:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
          }),
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.6fr_1fr] lg:gap-16">
        <div className="max-w-xs">
          <h2 className="text-3xl font-medium leading-[1.08] tracking-[-0.03em] text-foreground sm:text-4xl">Questions</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">The short ones are here. For anything else, type your own at the bottom.</p>
        </div>

        <div className="border-t border-foreground/10">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            return (
              <div key={faq.question} className="border-b border-foreground/10">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <span className="text-lg font-medium text-foreground">{faq.question}</span>
                    <HugeiconsIcon
                      icon={ChevronDownIcon}
                      strokeWidth={2}
                      className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:text-foreground", isOpen && "rotate-180")}
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      initial={reduce ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={reduce ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-6 pr-12 text-base leading-relaxed text-muted-foreground">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          <AskRow />
        </div>
      </div>
    </section>
  );
}
