"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon as ArrowUp,
  Search01Icon as Search,
  SparklesIcon as Sparkles,
} from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { useAuthCta } from "@/hooks/use-auth-cta";

// A scripted preview, not a live RAG call — visitors can type, but every
// reply is one of a few fixed scenarios matched by keyword, same idea as
// ai-chat-1's canned-reply demo (@shoogle/7ovr/ai-chat-1) minus the part
// where it pretends any question gets a real answer. Wiring a real
// useChat() stream in here would mean an anonymous page load can trigger a
// real RAG agent call against the server — not something to do by default.
interface SourceMemory {
  id: string;
  title: string;
  detail: string;
  type: keyof typeof MEMORY_TYPE_ICONS;
}

interface Scenario {
  match: RegExp;
  prompt: string;
  query: string;
  sources: SourceMemory[];
  answer: string;
}

const SCENARIOS: Scenario[] = [
  {
    match: /nas|home ?lab|zfs|truenas|synology/i,
    prompt: "What did I save about a home lab NAS?",
    query: "home lab NAS storage",
    sources: [
      { id: "s1", type: "web", title: "Synology vs. self-built TrueNAS: a real cost breakdown", detail: "eshop-nas-comparisons.dev" },
      { id: "s2", type: "video", title: "Building a 6-bay ZFS NAS from scratch", detail: "YouTube — Level1Techs" },
      { id: "s3", type: "note", title: "home lab — drive shortlist", detail: "Note, saved Sept 14" },
    ],
    answer:
      "You looked into this twice: a Synology-vs-TrueNAS cost breakdown in September, then a 6-bay ZFS build video a week later. " +
      "Neither ends on a decision — the TrueNAS article's last line is “price out drives before deciding,” and that's the last thing you saved on it.",
  },
  {
    match: /desk|standing|ergonomic/i,
    prompt: "Find the standing desk comparison I saved.",
    query: "standing desk comparison",
    sources: [
      { id: "s4", type: "web", title: "Six standing desks under $600, tested for wobble", detail: "deskreviews.co" },
      { id: "s5", type: "image", title: "Screenshot — desk frame spec sheet", detail: "Saved from a PDF, Aug 3" },
    ],
    answer:
      "One saved article compares six frames under $600 by wobble at full height — the Uplift V2 and the Fully Jarvis came out on top. " +
      "You also screenshotted a spec sheet the same week, for a frame that isn't mentioned in that article.",
  },
];

const FALLBACK_ANSWER =
  "This preview only knows the two examples above. The real thing searches everything you've actually saved — try it free.";

type Turn =
  | { kind: "user"; id: string; text: string }
  | { kind: "searching"; id: string; query: string }
  | { kind: "sources"; id: string; query: string; memories: SourceMemory[] }
  | { kind: "answer"; id: string; text: string; grounded: boolean };

const turnVariants: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(3px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 26, stiffness: 140 } },
};

function matchScenario(text: string): Scenario | null {
  return SCENARIOS.find((s) => s.match.test(text)) ?? null;
}

export function AskSection() {
  const cta = useAuthCta();
  const composerId = useId();
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const uid = useRef(0);

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  function nextId() {
    uid.current += 1;
    return `t${uid.current}`;
  }

  function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setBusy(true);
    setDraft("");

    const scenario = matchScenario(question);
    const searchId = nextId();

    setTurns((prev) => [
      ...prev,
      { kind: "user", id: nextId(), text: question },
      { kind: "searching", id: searchId, query: scenario?.query ?? question },
    ]);

    const t1 = setTimeout(() => {
      setTurns((prev) => {
        const withoutSearching = prev.filter((t) => t.id !== searchId);
        if (!scenario) return withoutSearching;
        return [
          ...withoutSearching,
          { kind: "sources", id: nextId(), query: scenario.query, memories: scenario.sources },
        ];
      });

      const t2 = setTimeout(() => {
        setTurns((prev) => [
          ...prev,
          scenario
            ? { kind: "answer", id: nextId(), text: scenario.answer, grounded: true }
            : { kind: "answer", id: nextId(), text: FALLBACK_ANSWER, grounded: false },
        ]);
        setBusy(false);
      }, 550);
      timers.current.push(t2);
    }, 850);
    timers.current.push(t1);
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-24 sm:py-32 md:px-12">
      <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-20">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Ask SaveForLatter
        </span>
        <h2 className="mt-4 text-3xl font-normal tracking-tight text-balance text-foreground sm:text-5xl">
          Ask a question. Get an answer with receipts.
        </h2>
        <p className="mt-4 text-base text-pretty text-muted-foreground">
          Every claim points back to something you actually saved — try one of the
          examples below.
        </p>
      </div>

      <Card className="w-full border-border shadow-sm">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <HugeiconsIcon icon={Sparkles} strokeWidth={2.25} className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm leading-none font-semibold tracking-tight text-foreground">
                SaveForLatter
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <HugeiconsIcon icon={Search} strokeWidth={2.25} className="h-3 w-3" />
                Only searches what you&apos;ve saved
              </span>
            </div>
            <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Preview
            </span>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-0">
          <MessageScrollerProvider autoScroll defaultScrollPosition="end">
            <MessageScroller className="h-[360px]">
              <MessageScrollerViewport>
                <MessageScrollerContent className="gap-4 px-4 py-4">
                  <MessageScrollerItem messageId="intro">
                    <Message align="start">
                      <MessageAvatar>
                        <Avatar size="sm">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <HugeiconsIcon icon={Sparkles} strokeWidth={2.25} className="h-3.5 w-3.5" />
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                      <MessageContent>
                        <Bubble align="start" variant="muted">
                          <BubbleContent>
                            Ask about anything you&rsquo;ve saved. Try one of these, or type your own.
                          </BubbleContent>
                        </Bubble>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {SCENARIOS.map((s) => (
                            <button
                              key={s.prompt}
                              type="button"
                              disabled={busy}
                              onClick={() => ask(s.prompt)}
                              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                            >
                              {s.prompt}
                            </button>
                          ))}
                        </div>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>

                  {turns.map((turn) => (
                    <MessageScrollerItem key={turn.id} messageId={turn.id} scrollAnchor={turn.kind === "user"}>
                      <motion.div initial="hidden" animate="show" variants={turnVariants}>
                        {turn.kind === "user" && (
                          <Message align="end">
                            <MessageAvatar>
                              <Avatar size="sm">
                                <AvatarFallback className="text-[10px] font-semibold">You</AvatarFallback>
                              </Avatar>
                            </MessageAvatar>
                            <MessageContent>
                              <Bubble align="end">
                                <BubbleContent>{turn.text}</BubbleContent>
                              </Bubble>
                            </MessageContent>
                          </Message>
                        )}

                        {turn.kind === "searching" && (
                          <Marker>
                            <MarkerIcon>
                              <HugeiconsIcon icon={Search} strokeWidth={2.25} />
                            </MarkerIcon>
                            <MarkerContent className="shimmer">
                              Searching your memories for &ldquo;{turn.query}&rdquo;&hellip;
                            </MarkerContent>
                          </Marker>
                        )}

                        {turn.kind === "sources" && (
                          <div className="flex flex-col gap-2">
                            <Marker>
                              <MarkerIcon>
                                <HugeiconsIcon icon={Search} strokeWidth={2.25} />
                              </MarkerIcon>
                              <MarkerContent>
                                Searched your memories for &ldquo;{turn.query}&rdquo; &middot; {turn.memories.length} found
                              </MarkerContent>
                            </Marker>
                            <AttachmentGroup>
                              {turn.memories.map((memory) => (
                                <Attachment key={memory.id} size="sm" className="w-52">
                                  <AttachmentMedia variant="icon">
                                    <HugeiconsIcon icon={MEMORY_TYPE_ICONS[memory.type]} strokeWidth={2.25} />
                                  </AttachmentMedia>
                                  <AttachmentContent>
                                    <AttachmentTitle>{memory.title}</AttachmentTitle>
                                    <AttachmentDescription>{memory.detail}</AttachmentDescription>
                                  </AttachmentContent>
                                </Attachment>
                              ))}
                            </AttachmentGroup>
                          </div>
                        )}

                        {turn.kind === "answer" && (
                          <Message align="start">
                            <MessageAvatar>
                              <Avatar size="sm">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  <HugeiconsIcon icon={Sparkles} strokeWidth={2.25} className="h-3.5 w-3.5" />
                                </AvatarFallback>
                              </Avatar>
                            </MessageAvatar>
                            <MessageContent>
                              <Bubble align="start" variant={turn.grounded ? "muted" : "outline"}>
                                <BubbleContent className="text-sm leading-relaxed">{turn.text}</BubbleContent>
                              </Bubble>
                              {!turn.grounded && (
                                <Link
                                  href={cta.href}
                                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                                >
                                  {cta.label} →
                                </Link>
                              )}
                            </MessageContent>
                          </Message>
                        )}
                      </motion.div>
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
            </MessageScroller>
          </MessageScrollerProvider>
        </CardContent>

        <CardFooter className="px-4 py-3">
          <form
            className="flex w-full items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            <label htmlFor={composerId} className="sr-only">
              Ask a question
            </label>
            <Input
              id={composerId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about the examples above…"
              disabled={busy}
              className="h-9 flex-1 text-sm"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Ask"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
            >
              <HugeiconsIcon icon={ArrowUp} strokeWidth={2.25} className="h-4 w-4" />
            </button>
          </form>
        </CardFooter>
      </Card>
    </section>
  );
}

export default AskSection;
