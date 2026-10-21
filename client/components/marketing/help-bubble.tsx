"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Streamdown } from "streamdown";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp02Icon as SendIcon,
  BookOpen01Icon as GuidesIcon,
  BubbleChatQuestionIcon as AskIcon,
  Cancel01Icon as CloseIcon,
  Mail01Icon as MailIcon,
  ArrowExpand01Icon as ExpandIcon,
  ArrowShrink02Icon as CollapseIcon,
  MinusSignIcon as MinimizeIcon,
  MoreVerticalIcon as MoreIcon,
  PlusSignCircleIcon as NewIcon,
  StopIcon,
} from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { HelpError, MAX_QUESTION, askHelp, type HelpAnswer } from "@/lib/help-ask";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/contact";
import { SELF_HOSTED, hostedHref } from "@/lib/instance";
import { cn } from "@/lib/utils";

// The FAQ's question box as a floating chat on every marketing page, so a
// visitor can ask without scrolling to the FAQ. Laid out like a support chat:
// a header with the logo, a greeting, the conversation as bubbles, and a
// message box. Each question is answered on its own from the help guides by AI
// (the server keeps no conversation), and the panel says so; a person is one
// link away on the contact page. On the hosted site it sits above the Buy Me a
// Coffee button in the same corner. Not on the sign-in pages, where it would
// only sit over the form.

const EASE = [0.16, 1, 0.3, 1] as const;
// Each one is answered by the help guides; check that before changing them.
const STARTERS = ["Can I import my browser bookmarks?", "Is there a free plan?", "How do I self-host Savedly?"];

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

/** The Savedly mark in a round badge, beside each answer. */
function Avatar({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/15", className)}>
      <LogoMark ticks={false} className="size-5" />
    </span>
  );
}

/** A quiet ring pattern behind the header, in the text colour so it suits both themes. */
function HeaderPattern() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full text-foreground opacity-[0.05] [mask-image:linear-gradient(to_bottom,#000_40%,transparent)]">
      <defs>
        <pattern id="help-rings" width="44" height="44" patternUnits="userSpaceOnUse">
          <circle cx="22" cy="22" r="22" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="0" cy="0" r="22" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="44" cy="0" r="22" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="0" cy="44" r="22" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="44" cy="44" r="22" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#help-rings)" />
    </svg>
  );
}

const PROSE =
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_code]:text-[0.9em] [&_li]:mt-1 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2.5 [&_strong]:font-semibold [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5";

function HelpBubbleInner() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  // The ⋮ menu, and the larger view it can switch to.
  const [menu, setMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const menuBox = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const writing = turns.at(-1)?.status === "writing";

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    // Esc closes the menu first, then the chat.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuBox.current?.dataset.open === "true") setMenu(false);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // A click anywhere outside the menu closes it.
  useEffect(() => {
    if (!menu) return;
    const onDown = (event: PointerEvent) => !menuBox.current?.contains(event.target as Node) && setMenu(false);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menu]);

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

  const startOver = () => {
    request.current?.abort();
    setTurns([]);
    setText("");
    input.current?.focus();
  };

  const actions = [
    { id: "minimize", label: "Minimize chat", icon: MinimizeIcon },
    { id: "size", label: expanded ? "Collapse view" : "Expand view", icon: expanded ? CollapseIcon : ExpandIcon },
    { id: "new", label: "New conversation", icon: NewIcon },
  ] as const;
  const runAction = (id: (typeof actions)[number]["id"]) => {
    setMenu(false);
    if (id === "minimize") setOpen(false);
    else if (id === "size") setExpanded((e) => !e);
    else startOver();
  };

  return (
    <div className={cn("fixed right-[18px] z-[60] flex flex-col items-end gap-3 font-sans antialiased", SELF_HOSTED ? "bottom-[18px]" : "bottom-[96px]")}>
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Ask about Savedly"
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{ transformOrigin: "100% 100%" }}
            className={cn(
              "flex flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl shadow-black/20 transition-[width,height] duration-300 ease-out motion-reduce:transition-none",
              expanded ? "h-[calc(100dvh-9.5rem)] w-[min(44rem,calc(100vw-36px))]" : "h-[min(40rem,calc(100dvh-9.5rem))] w-[min(25rem,calc(100vw-36px))]",
            )}
          >
            {/* Header */}
            <header className="relative shrink-0 border-b border-border bg-muted/40 px-4 pt-3 pb-4">
              <HeaderPattern />
              <div className="relative flex items-center justify-between">
                <Link href="/help" aria-label="Help Center" title="Help Center" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                  <HugeiconsIcon icon={GuidesIcon} strokeWidth={2} className="size-4" />
                </Link>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/30">
                  <HugeiconsIcon icon={AskIcon} strokeWidth={2} className="size-3.5" />
                  Ask Savedly
                </span>
                <div ref={menuBox} data-open={menu} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenu((m) => !m)}
                    aria-label="Quick actions"
                    aria-haspopup="menu"
                    aria-expanded={menu}
                    className={cn("grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground", menu && "bg-background text-foreground")}
                  >
                    <HugeiconsIcon icon={MoreIcon} strokeWidth={2} className="size-4" />
                  </button>
                  <AnimatePresence>
                    {menu && (
                      <motion.div
                        role="menu"
                        aria-label="Quick actions"
                        initial={reduce ? false : { opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? undefined : { opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        style={{ transformOrigin: "100% 0%" }}
                        className="absolute top-9 right-0 z-10 w-52 rounded-xl border border-border bg-background p-1.5 shadow-xl shadow-black/10"
                      >
                        <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold text-muted-foreground">Quick actions</p>
                        {actions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            role="menuitem"
                            onClick={() => runAction(action.id)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
                          >
                            <HugeiconsIcon icon={action.icon} strokeWidth={2} className="size-4 text-muted-foreground" />
                            {action.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="relative mt-3 flex flex-col items-center text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-background shadow-sm ring-1 ring-border">
                  <LogoMark ticks={false} className="size-8" />
                </span>
                <h2 className="mt-2.5 text-[15px] font-semibold text-foreground">Questions? Ask us.</h2>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Answers in seconds, from our help guides
                </p>
              </div>
            </header>

            {/* Conversation */}
            <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="flex items-end gap-2">
                <Avatar />
                <p className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm text-foreground">How can we help with Savedly?</p>
              </div>
              {turns.length === 0 && (
                <div className="flex flex-col items-end gap-2 pl-10">
                  {STARTERS.map((starter) => (
                    <button key={starter} type="button" onClick={() => ask(starter)} className="rounded-2xl rounded-br-md px-3 py-2 text-right text-xs font-medium text-primary ring-1 ring-primary/30 transition-colors hover:bg-primary/[0.06]">
                      {starter}
                    </button>
                  ))}
                </div>
              )}

              {turns.map((turn, i) => (
                <div key={i} className="space-y-4">
                  <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm whitespace-pre-wrap text-primary-foreground">{turn.question}</p>
                  <div className="flex items-end gap-2">
                    <Avatar />
                    <div className="min-w-0 max-w-[85%]">
                      <div className={cn("rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground", PROSE)}>
                        {turn.status === "error" ? (
                          <p role="alert">
                            {turn.error || "The help box isn't available right now."} You can also write to{" "}
                            <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
                          </p>
                        ) : turn.answer ? (
                          <Streamdown isAnimating={turn.status === "writing"}>{turn.answer}</Streamdown>
                        ) : (
                          <span aria-label="Writing an answer" className="flex gap-1 py-1.5">
                            {[0, 1, 2].map((dot) => (
                              <span key={dot} className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 motion-reduce:animate-none" style={{ animationDelay: `${dot * 120}ms` }} />
                            ))}
                          </span>
                        )}
                      </div>
                      {turn.links.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {turn.links.map((link) => (
                            <Link key={link.href} href={link.href} className="rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-foreground ring-1 ring-foreground/15 transition-colors hover:bg-muted">
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      )}
                      {turn.status === "stopped" && <p className="mt-1 text-[11px] text-muted-foreground/80">Stopped.</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message box */}
            <div className="shrink-0 px-3 pb-2">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void ask(text);
                }}
                className="rounded-2xl border border-border bg-background transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
              >
                <label htmlFor="help-bubble-ask" className="sr-only">
                  Your question
                </label>
                <textarea
                  ref={input}
                  id="help-bubble-ask"
                  rows={2}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void ask(text);
                    }
                  }}
                  maxLength={MAX_QUESTION}
                  placeholder="Type your question…"
                  className="block w-full resize-none bg-transparent px-3.5 pt-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <div className="flex items-center justify-between gap-2 px-2 pb-2">
                  <Link href={hostedHref("/contact")} className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <HugeiconsIcon icon={MailIcon} strokeWidth={2} className="size-3.5" />
                    Talk to a person
                  </Link>
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
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <HugeiconsIcon icon={StopIcon} strokeWidth={2.25} className="size-3.5 fill-current" />
                    </button>
                  ) : (
                    <button key="send" type="submit" disabled={text.trim().length < 3} aria-label="Ask" className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-25">
                      <HugeiconsIcon icon={SendIcon} strokeWidth={2.25} className="size-4" />
                    </button>
                  )}
                </div>
              </form>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground/80">Answered by AI from our help guides. It can be wrong.</p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close the help box" : "Ask about Savedly"}
        title={open ? undefined : "Ask about Savedly"}
        className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={open ? "close" : "ask"}
            initial={reduce ? false : { opacity: 0, rotate: -45, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, rotate: 45, scale: 0.6 }}
            transition={{ duration: 0.18 }}
            className="grid place-items-center"
          >
            <HugeiconsIcon icon={open ? CloseIcon : AskIcon} strokeWidth={2} className="size-6" />
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
