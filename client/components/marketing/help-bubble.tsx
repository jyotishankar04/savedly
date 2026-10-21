"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Streamdown } from "streamdown";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon as SendIcon, BubbleChatQuestionIcon as AskIcon, Cancel01Icon as CloseIcon, StopIcon } from "@hugeicons/core-free-icons";
import { HelpError, MAX_QUESTION, askHelp, type HelpAnswer } from "@/lib/help-ask";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { SELF_HOSTED } from "@/lib/instance";
import { cn } from "@/lib/utils";

// The FAQ's question box as a floating button on every marketing page, so a
// visitor can ask without scrolling to the FAQ. Each question is answered on
// its own from the help guides (the server keeps no conversation); the panel
// just keeps this visit's questions and answers in view. On the hosted site it
// sits above the Buy Me a Coffee button in the same corner. Not on the sign-in
// pages, where it would only sit over the form.

const EASE = [0.16, 1, 0.3, 1] as const;
const STARTERS = ["Can I import from Pocket or Raindrop?", "Is there a free plan?", "How do I self-host Savedly?"];

interface Turn {
  question: string;
  answer: string;
  links: HelpAnswer["links"];
  status: "writing" | "done" | "stopped" | "error";
  error?: string;
}

export function HelpBubble() {
  const onAuth = usePathname().startsWith("/auth");
  return onAuth ? null : <HelpBubbleInner />;
}

function HelpBubbleInner() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const writing = turns.at(-1)?.status === "writing";

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Follow the answer as it's written.
  const last = turns.at(-1);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns.length, last?.answer, last?.status]);

  const update = (patch: Partial<Turn>) => setTurns((all) => all.map((turn, i) => (i === all.length - 1 ? { ...turn, ...patch } : turn)));

  async function ask(question: string) {
    question = question.trim();
    if (question.length < 3 || writing) return;
    const controller = new AbortController();
    request.current = controller;
    setText("");
    setTurns((all) => [...all, { question, answer: "", links: [], status: "writing" }]);
    let soFar = "";
    try {
      const reply = await askHelp(question, controller.signal, (t) => {
        soFar = t;
        update({ answer: t });
      });
      update({ answer: reply.answer, links: reply.links, status: "done" });
    } catch (err) {
      if (controller.signal.aborted) update({ answer: soFar, status: "stopped" });
      else update({ status: "error", error: err instanceof HelpError ? err.message : "" });
    }
  }

  return (
    <div className={cn("fixed right-[18px] z-[60] flex flex-col items-end gap-3 font-sans antialiased", SELF_HOSTED ? "bottom-[18px]" : "bottom-[96px]")}>
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Ask about Savedly"
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{ transformOrigin: "100% 100%" }}
            className="flex max-h-[min(36rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-36px))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-black/15"
          >
            <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Ask about Savedly</h2>
                <p className="text-xs text-muted-foreground">Answered from our help guides</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="-mr-1 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <HugeiconsIcon icon={CloseIcon} strokeWidth={2} className="size-4" />
              </button>
            </header>

            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {turns.length === 0 ? (
                <div>
                  <p className="text-sm leading-relaxed text-muted-foreground">Ask anything about saving, search, plans, the extension or self-hosting.</p>
                  <div className="mt-3 flex flex-col items-start gap-2">
                    {STARTERS.map((starter) => (
                      <button key={starter} type="button" onClick={() => ask(starter)} className="rounded-full px-3 py-1.5 text-left text-xs font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-muted">
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {turns.map((turn, i) => (
                    <div key={i}>
                      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">{turn.question}</p>
                      <div className="mt-2.5 text-sm leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-[0.9em] [&_code]:text-foreground [&_li]:mt-1 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
                        {turn.status === "error" ? (
                          <p role="alert">
                            {turn.error || "The help box isn't available right now."} You can also write to{" "}
                            <a href={SUPPORT_MAILTO} className="text-foreground underline underline-offset-4">
                              {SUPPORT_EMAIL}
                            </a>
                            .
                          </p>
                        ) : turn.answer ? (
                          <Streamdown isAnimating={turn.status === "writing"}>{turn.answer}</Streamdown>
                        ) : (
                          <span aria-label="Writing an answer" className="inline-flex gap-1 py-1.5">
                            {[0, 1, 2].map((dot) => (
                              <span key={dot} className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50 motion-reduce:animate-none" style={{ animationDelay: `${dot * 150}ms` }} />
                            ))}
                          </span>
                        )}
                      </div>
                      {turn.links.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {turn.links.map((link) => (
                            <Link key={link.href} href={link.href} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-muted">
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      )}
                      {turn.status === "stopped" && <p className="mt-1.5 text-[11px] text-muted-foreground/80">Stopped.</p>}
                    </div>
                  ))}
                  {turns.some((turn) => turn.status === "done") && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                      Written by AI from our help guides. It can be wrong; for anything important, check the guide or write to{" "}
                      <a href={SUPPORT_MAILTO} className="underline underline-offset-2 hover:text-foreground">
                        {SUPPORT_EMAIL}
                      </a>
                      .
                    </p>
                  )}
                </div>
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void ask(text);
              }}
              className="flex items-center gap-2 border-t border-border p-2.5"
            >
              <label htmlFor="help-bubble-ask" className="sr-only">
                Your question
              </label>
              <input
                ref={input}
                id="help-bubble-ask"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_QUESTION}
                autoComplete="off"
                placeholder="Ask a question…"
                className="min-w-0 flex-1 rounded-xl bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              {writing ? (
                // Its own key and the default cancelled, as in the FAQ box: otherwise the
                // same click turns into Send and asks the question again.
                <button
                  key="stop"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    request.current?.abort();
                  }}
                  aria-label="Stop"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <HugeiconsIcon icon={StopIcon} strokeWidth={2.25} className="size-3.5 fill-current" />
                </button>
              ) : (
                <button key="send" type="submit" disabled={text.trim().length < 3} aria-label="Ask" className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-25">
                  <HugeiconsIcon icon={SendIcon} strokeWidth={2.25} className="size-4" />
                </button>
              )}
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close the help box" : "Ask about Savedly"}
        title={open ? undefined : "Ask about Savedly"}
        className="grid size-[52px] place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <HugeiconsIcon icon={open ? CloseIcon : AskIcon} strokeWidth={2} className="size-6" />
      </button>
    </div>
  );
}
