"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon as ArrowUp, ChevronDownIcon as ChevronDown, ChevronRightIcon as ChevronRight, GlobeIcon as Globe, MessageSquareIcon as MessageSquare, PlusIcon as Plus, Search01Icon as Search } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Message, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { askStreamUrl, getThreadMessages, type ThreadMessage } from "@/lib/ask";
import {
  threadMessagesQueryKey,
  useCreateThreadMutation,
  useThreadMessagesQuery,
  useThreadsQuery,
} from "@/context/AskContext";
import { memoryQueryKey } from "@/context/MemoryContext";
import { useSidebarState } from "@/context/SidebarContext";
import { getMemory } from "@/lib/memories";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { PlanLimitNotice, ProBadge } from "@/components/plan-limit-notice";
import { MemoryPreviewCard } from "@/components/memory-preview-card";
import { AiConfiguredGate } from "@/components/ai-configured-gate";
import { cn } from "@/lib/utils";
import { HelpActions } from "@/components/ask/help-actions";
import { AskEmptyState } from "@/components/ask/ask-empty-state";
import type { MemoryType } from "@/types/memory";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentGroup, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from "@/components/ui/attachment";
import { toolActivityLabel } from "@/lib/ask-tools";
import { EventResultCard, isEventToolName, parseEventToolOutput } from "@/components/ask/event-result-card";
import { ConfirmActionCard, pendingConfirmations } from "@/components/ask/confirm-action-card";

/** search_memories (topic/keyword) and search_memories_by_date (a day or
 * date range, see the server's rag/tools/search-memories-by-date.ts) both
 * return the same {query, memories} shape — so the same marker, cards, and
 * Sources/Referenced sections render either one's result identically. */
function isMemorySearchToolName(name: string): boolean {
  return name === "search_memories" || name === "search_memories_by_date";
}

interface SearchMemoriesResult {
  query: string;
  memories: {
    id: string;
    title: string;
    type: string;
    source: string | null;
    url: string | null;
    faviconUrl: string | null;
    snippet: string;
  }[];
}

function parseToolOutput(output: unknown): SearchMemoriesResult | null {
  try {
    const kwargs = (output as { kwargs?: { content?: string } })?.kwargs;
    if (!kwargs?.content) return null;
    return JSON.parse(kwargs.content) as SearchMemoriesResult;
  } catch {
    return null;
  }
}

/** memory.source is usually null in practice; fall back to the URL's
 * hostname (cleaner than a random mid-sentence fragment of the raw
 * chunk snippet) before falling back to the snippet itself. */
function getCardDescription(memory: SearchMemoriesResult["memories"][number]): string {
  if (memory.source) return memory.source;
  if (memory.url) {
    try {
      return new URL(memory.url).hostname.replace(/^www\./, "");
    } catch {
      // not a valid absolute URL — fall through to the snippet
    }
  }
  return memory.snippet.replace(/\s+/g, " ").trim();
}


function MemoryAttachmentCards({ memories }: { memories: SearchMemoriesResult["memories"] }) {
  // const [activeCardMenu, setActiveCardMenu] = useState<string | null>(null);

  return (
    <AttachmentGroup>
      {memories.map((memory) => {
        const TypeIcon = MEMORY_TYPE_ICONS[memory.type as MemoryType] ?? Globe;
        return (
          <Attachment key={memory.id} size="sm" className="w-56 sm:w-60">
            <AttachmentMedia variant="icon">
              <HugeiconsIcon icon={TypeIcon} strokeWidth={2.25} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{memory.title}</AttachmentTitle>
              <AttachmentDescription>{getCardDescription(memory)}</AttachmentDescription>
            </AttachmentContent>
            <AttachmentTrigger render={<Link href={`/app/memories/${memory.id}`} />} />
          </Attachment>
        );
      })}
    </AttachmentGroup>
  );
}

/** Dedupes memories across every search_memories call in one assistant
 * turn — the sources sidebar reflects everything that could have informed
 * the answer, not just the last search. */
function collectCitedMemories(parts: UIMessage["parts"]): SearchMemoriesResult["memories"] {
  const byId = new Map<string, SearchMemoriesResult["memories"][number]>();
  for (const part of parts) {
    if (part.type !== "dynamic-tool" || !isMemorySearchToolName(part.toolName) || part.state !== "output-available") continue;
    const result = parseToolOutput(part.output);
    if (!result) continue;
    for (const memory of result.memories) byId.set(memory.id, memory);
  }
  return [...byId.values()];
}

/** Only the memories the answer text actually names (by URL or title) — the
 * search tool often turns up more candidates than the model ends up using.
 * Rendered inline below the response; distinct from the Sources sidebar
 * (getCurrentSources below), which intentionally keeps showing everything
 * the search found, referenced or not. */
function getReferencedMemories(parts: UIMessage["parts"]): SearchMemoriesResult["memories"] {
  const cited = collectCitedMemories(parts);
  if (cited.length === 0) return cited;
  const answerText = parts
    .filter((p): p is Extract<(typeof parts)[number], { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n");
  if (!answerText) return [];
  return cited.filter((memory) => (memory.url && answerText.includes(memory.url)) || answerText.includes(memory.title));
}

/** The search tool's result only carries a snippet-level shape (title,
 * source, favicon) — not the real memory card (thumbnail, tags, saved-at
 * time). Fetches each referenced memory's full record so "Referenced" can
 * render the same card design as the Memories grid, reusing the app's
 * existing per-memory cache (memoryQueryKey) rather than a one-off. */
function ReferencedMemoryCards({ memories }: { memories: SearchMemoriesResult["memories"] }) {
  const results = useQueries({
    queries: memories.map((memory) => ({
      queryKey: memoryQueryKey(memory.id),
      queryFn: () => getMemory(memory.id),
      staleTime: 60_000,
    })),
  });

  return (
    <div className="flex gap-2 overflow-x-auto overscroll-x-contain scroll-fade-x scrollbar-none py-1">
      {results.map((result, i) =>
        result.data ? (
          <MemoryPreviewCard key={memories[i].id} memory={result.data} />
        ) : (
          <div key={memories[i].id} className="h-32 w-40 sm:w-44 shrink-0 animate-pulse rounded-xl border border-border/45 bg-muted/40" />
        ),
      )}
    </div>
  );
}

/** Sources for the *current* assistant turn only, and only once its answer
 * text has actually started streaming in — not the moment the search tool
 * result lands. A tool call resolves well before the model's reply starts
 * generating, so surfacing sources at that point produced a "flash" of
 * cards during the thinking gap, followed by them reappearing once the
 * text showed up. Gating on the presence of text (not tool completion)
 * mirrors Perplexity's sidebar, which only populates once the answer
 * itself begins. */
function getCurrentSources(messages: UIMessage[]): SearchMemoriesResult["memories"] | null {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  if (!last) return null;
  const hasAnswerText = last.parts.some((p) => p.type === "text" && p.text.trim().length > 0);
  if (!hasAnswerText) return null;
  const cited = collectCitedMemories(last.parts);
  return cited.length > 0 ? cited : null;
}

/** Sources live in the normal flex flow (like the history sidebar), just
 * collapsed to a slim tab by default — a `position: fixed` overlay panel
 * sat on top of the chat instead of reserving its own space, so it clipped
 * message bubbles and forced a horizontal scrollbar at narrower widths
 * (confirmed live before this fix). Toggling still gives it the "floating"
 * look via the rounded/shadowed card inside the reserved column, it just
 * never overlaps content. */
function SourcesPanel({
  memories,
  open,
  onToggle,
}: {
  memories: SearchMemoriesResult["memories"];
  open: boolean;
  onToggle: () => void;
}) {
  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="hidden lg:flex shrink-0 w-10 flex-col items-center gap-2 border-l border-border/20 py-6 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
      >
        <HugeiconsIcon icon={Search} strokeWidth={2.25} className="h-4 w-4" />
        <span className="text-[10px] font-semibold tracking-wider [writing-mode:vertical-rl] rotate-180">
          SOURCES
        </span>
      </button>
    );
  }

  return (
    <div className="hidden lg:flex shrink-0 w-72 flex-col h-full py-6 pr-4 pl-2">
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/20 bg-card shadow-sm p-3">
        <button onClick={onToggle} className="flex items-center justify-between shrink-0 mb-2 group">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sources</span>
          <HugeiconsIcon icon={ChevronRight} strokeWidth={2.25} className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
        </button>
        <ScrollArea className="flex-1 min-h-0" viewportClassName="pr-2">
          <div className="flex flex-col gap-2">
            {memories.map((memory) => {
              const TypeIcon = MEMORY_TYPE_ICONS[memory.type as MemoryType] ?? Globe;
              return (
                <Attachment key={memory.id} size="sm" className="w-full">
                  <AttachmentMedia variant="icon">
                    <HugeiconsIcon icon={TypeIcon} strokeWidth={2.25} />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{memory.title}</AttachmentTitle>
                    <AttachmentDescription>{getCardDescription(memory)}</AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentTrigger render={<Link href={`/app/memories/${memory.id}`} />} />
                </Attachment>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function SearchToolPart({ part }: { part: Extract<UIMessage["parts"][number], { type: "dynamic-tool" }> }) {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <Marker>
        <MarkerIcon>
          <HugeiconsIcon icon={Search} strokeWidth={2.25} />
        </MarkerIcon>
        <MarkerContent className="shimmer">Searching your memories&hellip;</MarkerContent>
      </Marker>
    );
  }

  if (part.state !== "output-available") return null;

  const result = parseToolOutput(part.output);
  if (!result) return null;

  if (result.memories.length === 0) {
    return (
      <Marker>
        <MarkerIcon>
          <HugeiconsIcon icon={Search} strokeWidth={2.25} />
        </MarkerIcon>
        <MarkerContent>No matching memories found for &ldquo;{result.query}&rdquo;</MarkerContent>
      </Marker>
    );
  }

  return (
    <Collapsible className="space-y-2">
      <CollapsibleTrigger
        render={
          <button className="w-full group/trigger">
            <Marker>
              <MarkerIcon>
                <HugeiconsIcon icon={Search} strokeWidth={2.25} />
              </MarkerIcon>
              <MarkerContent>
                Searched your memories for &ldquo;{result.query}&rdquo; &middot; {result.memories.length} found
              </MarkerContent>
              <HugeiconsIcon icon={ChevronDown} strokeWidth={2.25} className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-180" />
            </Marker>
          </button>
        }
      />
      <CollapsibleContent>
        <MemoryAttachmentCards memories={result.memories} />
      </CollapsibleContent>
    </Collapsible>
  );
}

// The server reconstructs the same {text, dynamic-tool} part shape the live
// streaming path produces (see ai.service.ts's getThreadMessages) — this is
// a type-only pass-through, not a data conversion, so a resumed thread
// renders through the exact same SearchToolPart/MemoryAttachmentCards
// components a live one does instead of degrading to text-only.
function toInitialMessages(history: ThreadMessage[]): UIMessage[] {
  return history as unknown as UIMessage[];
}

export default function AskPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The on-page thread sidebar below is redundant once the main nav
  // sidebar is fully collapsed — that's exactly when the floating dock's
  // own "New chat"/"Chat history" buttons take over the same job, and
  // rendering both left this sidebar with nowhere clean to sit.
  const { fullyCollapsed: mainSidebarCollapsed } = useSidebarState();

  // Mirrored into the URL (?thread=<id>) so a hard refresh resumes the same
  // conversation instead of dropping back to the empty "New chat" state —
  // switching threads via History or creating one, then reloading, used to
  // lose the whole view (confirmed live before this fix).
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(() => searchParams.get("thread"));
  const setActiveThreadId = (id: string | null) => {
    setActiveThreadIdState(id);
    router.replace(id ? `${pathname}?thread=${id}` : pathname, { scroll: false });
  };

  // ?q= pre-fills the question (Search's "Ask instead" hands its query over); it isn't sent until the user does.
  const [input, setInput] = useState(() => searchParams.get("q") ?? "");
  const seededThreadRef = useRef<string | null>(null);
  const pendingMessageRef = useRef<string | null>(null);
  const queryLimit = usePlanLimit("ai_monthly_queries");

  const { data: threads = [], isLoading: threadsLoading } = useThreadsQuery();
  const { data: history } = useThreadMessagesQuery(activeThreadId);
  const createThreadMutation = useCreateThreadMutation();
  const queryClient = useQueryClient();

  const transport = useMemo(() => {
    if (!activeThreadId) return undefined;
    return new DefaultChatTransport({
      api: askStreamUrl(activeThreadId),
      credentials: "include",
      prepareSendMessagesRequest: ({ messages }) => {
        const last = messages[messages.length - 1];
        const text =
          last?.parts
            ?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
            .map((p) => p.text)
            .join("") ?? "";
        return { body: { query: text }, credentials: "include" };
      },
    });
  }, [activeThreadId]);

  const { messages, sendMessage, setMessages, status } = useChat({
    id: activeThreadId ?? "new",
    transport,
  });

  // Switching to a thread via History bypasses React Query's cache entirely
  // instead of relying on useThreadMessagesQuery's (possibly stale) `data` —
  // a thread's history query fires the moment it's created (see handleSubmit
  // below), well before the reply exists yet, and gets cached near-empty;
  // the seeding effect's one-shot guard below then never re-applies a later
  // background refetch's corrected result. Confirmed live: reopening a
  // just-created thread from History could show zero messages. Fetching
  // directly here sidesteps that race rather than trying to out-time it.
  async function handleSelectThread(threadId: string) {
    setActiveThreadId(threadId);
    seededThreadRef.current = threadId;
    setSourcesOpen(false);
    const fresh = await getThreadMessages(threadId);
    queryClient.setQueryData(threadMessagesQueryKey(threadId), fresh);
    setMessages(toInitialMessages(fresh));
  }

  // Seed a resumed thread's history exactly once per thread switch — this
  // only actually fires for the "loaded /app/ask?thread=X directly" case
  // now; History clicks are handled explicitly above (handleSelectThread
  // already marks seededThreadRef, so this is a no-op for that path).
  useEffect(() => {
    if (activeThreadId && history && seededThreadRef.current !== activeThreadId) {
      setMessages(toInitialMessages(history));
      seededThreadRef.current = activeThreadId;
    }
  }, [activeThreadId, history, setMessages]);

  // Fire a message queued from handleSubmit once a freshly-created thread's
  // transport is ready (transport depends on activeThreadId via useMemo
  // above, which only updates a render after setActiveThreadId). A ref (not
  // state) holds the queued text so this effect never calls a state setter.
  useEffect(() => {
    if (activeThreadId && pendingMessageRef.current && transport) {
      const text = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessage({ text });
    }
  }, [activeThreadId, transport, sendMessage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await send(input);
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || status === "streaming" || status === "submitted" || queryLimit.isAtLimit) return;
    setInput("");

    if (!activeThreadId) {
      pendingMessageRef.current = text;
      const thread = await createThreadMutation.mutateAsync(text.slice(0, 60));
      // Mark this brand-new thread as already-seeded *before* switching to
      // it — its history query will resolve to [] (nothing persisted yet)
      // sometime after this point, and without this the seeding effect's
      // guard (seededThreadRef.current !== activeThreadId) would still be
      // true when that stale empty response lands, wiping out the message
      // just sent below via a race between the two effects (confirmed live:
      // this was silently deleting the user's own message, leaving only the
      // assistant's reply visible).
      seededThreadRef.current = thread.id;
      setActiveThreadId(thread.id);
    } else {
      sendMessage({ text });
    }
  }

  function handleNewChat() {
    setActiveThreadId(null);
    setMessages([]);
    seededThreadRef.current = null;
    setSourcesOpen(false);
  }

  const isBusy = status === "streaming" || status === "submitted";
  const currentSources = useMemo(() => getCurrentSources(messages), [messages]);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // The main app sidebar's floating dock (app/(platfrom)/app/layout.tsx)
  // gains a "New chat"/"Chat history" pair once it's fully collapsed and
  // this page is active — the on-page thread sidebar has nowhere good to
  // dock at that point. The layout can't call this page's handlers directly
  // (it's a parent rendering `children`), so it dispatches window events
  // instead; this is the only listener for them.
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  useEffect(() => {
    const onNewChat = () => handleNewChat();
    const onOpenHistory = () => setHistoryModalOpen(true);
    window.addEventListener("ask:new-chat", onNewChat);
    window.addEventListener("ask:open-history", onOpenHistory);
    return () => {
      window.removeEventListener("ask:new-chat", onNewChat);
      window.removeEventListener("ask:open-history", onOpenHistory);
    };
  });

  return (
    <AiConfiguredGate className="h-full">
    <div className="h-full flex">
      {/* Secondary sidebar — thread history, scoped to this page (not the
          app's own nav sidebar). Collapsed away once the main sidebar is
          fully collapsed — the floating dock's "New chat"/"Chat history"
          buttons cover the same job at that point (see useSidebarState
          above), so keeping both just left this one stranded. */}
      <div
        className={cn(
          "hidden md:flex shrink-0 border-r border-border/20 flex-col h-full py-6 overflow-hidden transition-[width,opacity] duration-200",
          mainSidebarCollapsed ? "w-0 opacity-0 pointer-events-none border-r-0" : "w-60 opacity-100",
        )}
      >
        <div className="px-4 pb-3 w-60">
          <Button variant="outline" className="h-10 w-full justify-start gap-2 rounded-xl px-3 text-sm font-medium" onClick={handleNewChat}>
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" /> New chat
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0 w-60" viewportClassName="px-2 pb-4">
          {threadsLoading ? (
            <div className="space-y-1.5 px-1 py-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">Your conversations will show up here.</p>
          ) : (
            groupThreadsByDate(threads).map((group) => (
              <div key={group.label} className="pt-4 first:pt-1">
                <p className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.threads.map((thread) => {
                    const active = thread.id === activeThreadId;
                    return (
                      <li key={thread.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectThread(thread.id)}
                          aria-current={active ? "page" : undefined}
                          title={thread.title}
                          className={cn(
                            "w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                            active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          {thread.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Main conversation column */}
      <div className="flex-1 min-w-0 flex flex-col h-full py-4 md:py-6">
        {/* Phones: the history column above is hidden, so conversations are picked here instead. */}
        <div className="md:hidden flex items-center gap-2 px-4 pb-3">
          <Select
            items={Object.fromEntries(threads.map((t) => [t.id, t.title]))}
            value={activeThreadId ?? ""}
            onValueChange={(v) => v && handleSelectThread(v as string)}
          >
            <SelectTrigger className="h-9 min-w-0 flex-1 text-sm" aria-label="Conversation">
              <SelectValue placeholder={threads.length ? "Previous chats" : "No conversations yet"} />
            </SelectTrigger>
            <SelectContent>
              {threads.map((thread) => (
                <SelectItem key={thread.id} value={thread.id}>
                  {thread.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant={activeThreadId === null ? "default" : "outline"} size="sm" className="h-9 shrink-0 rounded-full gap-1.5 px-3.5 text-sm" onClick={handleNewChat}>
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-3.5 w-3.5" /> New
          </Button>
        </div>
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="flex-1 min-h-0">
            <MessageScrollerViewport>
              <MessageScrollerContent className="max-w-4xl mx-auto w-full px-4 md:px-6">
                {messages.length === 0 && <AskEmptyState onPick={send} disabled={isBusy || queryLimit.isAtLimit} />}

                {messages.map((message, messageIndex) => {
                  const isLastMessage = messageIndex === messages.length - 1;

                  // Between a tool call finishing and the reply's first text
                  // token, the message has parts (so the top-level
                  // "Thinking…" block below — gated on status "submitted" —
                  // has already stopped rendering) but nothing visible was
                  // shown for that gap. Perplexity-style "Generating a
                  // response…" fills it, without duplicating the search
                  // marker's own "Searching…" shimmer while a tool call is
                  // still in flight.
                  const toolParts = message.parts.filter((p) => p.type === "dynamic-tool");
                  const hasPendingTool = toolParts.some((p) => p.state === "input-streaming" || p.state === "input-available");
                  const hasText = message.parts.some((p) => p.type === "text" && p.text);
                  const showGenerating =
                    isLastMessage && message.role === "assistant" && isBusy && toolParts.length > 0 && !hasPendingTool && !hasText;
                  const referencedMemories = message.role === "assistant" ? getReferencedMemories(message.parts) : [];

                  return (
                    <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={message.role === "user"}>
                      <Message align={message.role === "user" ? "end" : "start"}>
                        <MessageContent>
                          {message.parts.map((part, i) => {
                            if (part.type === "text" && part.text) {
                              const isUser = message.role === "user";
                              return (
                                <Bubble key={i} align={isUser ? "end" : "start"} variant={isUser ? "default" : "ghost"}>
                                  <BubbleContent>
                                    {isUser ? (
                                      part.text
                                    ) : (
                                      <Streamdown isAnimating={isBusy && isLastMessage}>{part.text}</Streamdown>
                                    )}
                                  </BubbleContent>
                                </Bubble>
                              );
                            }
                            if (part.type === "dynamic-tool" && isMemorySearchToolName(part.toolName)) {
                              return <SearchToolPart key={i} part={part} />;
                            }
                            if (part.type === "dynamic-tool" && part.toolName === "get_platform_help" && (part.state === "input-streaming" || part.state === "input-available")) {
                              return (
                                <span key={i} className="shimmer text-xs text-muted-foreground px-2.5">
                                  Checking the Help Center&hellip;
                                </span>
                              );
                            }
                            if (
                              part.type === "dynamic-tool" &&
                              (part.state === "input-streaming" || part.state === "input-available") &&
                              toolActivityLabel(part.toolName)
                            ) {
                              return (
                                <span key={i} className="shimmer text-xs text-muted-foreground px-2.5">
                                  {toolActivityLabel(part.toolName)}
                                </span>
                              );
                            }
                            return null;
                          })}
                          {/* An event Ask added or moved: a card under the reply with buttons to open it. */}
                          {message.role === "assistant" &&
                            message.parts.map((part, i) => {
                              if (part.type !== "dynamic-tool" || !isEventToolName(part.toolName) || part.state !== "output-available") return null;
                              const event = parseEventToolOutput(part.output);
                              return event ? (
                                <div key={`event-${i}`} className="px-1">
                                  <EventResultCard event={event} />
                                </div>
                              ) : null;
                            })}
                          {/* Ask is waiting for a yes before it changes anything: only on the latest reply, where the answer still counts. */}
                          {message.role === "assistant" && isLastMessage && !isBusy && (
                            <div className="px-1">
                              <ConfirmActionCard actions={pendingConfirmations(message.parts)} onAnswer={send} disabled={queryLimit.isAtLimit} />
                            </div>
                          )}
                          {message.role === "assistant" && hasText && !(isBusy && isLastMessage) && <HelpActions parts={message.parts} />}
                          {showGenerating && (
                            <span className="shimmer text-xs text-muted-foreground px-2.5">
                              Generating a response&hellip;
                            </span>
                          )}
                          {referencedMemories.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5">
                                Referenced
                              </span>
                              <ReferencedMemoryCards memories={referencedMemories} />
                            </div>
                          )}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  );
                })}

                {status === "submitted" && (
                  <Message align="start">
                    <MessageContent>
                      <span className="shimmer text-xs text-muted-foreground px-2.5">Thinking&hellip;</span>
                    </MessageContent>
                  </Message>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full px-6 pt-3 shrink-0 space-y-2">
          {queryLimit.isAtLimit && (
            <PlanLimitNotice message={queryLimit.message ?? "You've reached your Ask query limit for this month."} />
          )}
          <div
            className={cn(
              "rounded-2xl border border-border bg-card shadow-sm transition-colors focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10",
              queryLimit.isAtLimit && "opacity-60",
            )}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === "TEXTAREA" || target.closest("button")) return;
              e.currentTarget.querySelector("textarea")?.focus();
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder={queryLimit.isAtLimit ? "You've reached your Ask query limit for this month..." : "Ask anything about what you've saved..."}
              rows={1}
              className="min-h-[48px] max-h-48 resize-none border-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:border-none focus-visible:ring-0 dark:bg-transparent"
              disabled={isBusy || queryLimit.isAtLimit}
            />
            <div className="flex items-center justify-between gap-2 pl-4 pr-2.5 pb-2.5">
              <span className="hidden text-xs text-muted-foreground/80 sm:inline">
                <kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift + Enter</kbd> for a new line
              </span>
              <span className="flex items-center gap-2 ml-auto">
                {queryLimit.isAtLimit && <ProBadge />}
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send"
                  title={queryLimit.isAtLimit ? queryLimit.message ?? undefined : undefined}
                  className="h-9 w-9 shrink-0 rounded-full disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                  disabled={isBusy || queryLimit.isAtLimit || !input.trim()}
                >
                  <HugeiconsIcon icon={ArrowUp} strokeWidth={2.25} className="h-4 w-4" />
                </Button>
              </span>
            </div>
          </div>
        </form>
      </div>

      {currentSources && (
        <SourcesPanel memories={currentSources} open={sourcesOpen} onToggle={() => setSourcesOpen((v) => !v)} />
      )}

      {/* Opened via the floating dock's "Chat history" button (only shown
          once the main sidebar is fully collapsed) — same thread list as
          the on-page sidebar, just reachable when that sidebar has nowhere
          to render. */}
      <CommandDialog open={historyModalOpen} onOpenChange={setHistoryModalOpen} title="Chat history" description="Jump to a previous conversation">
        <CommandInput placeholder="Search conversations..." />
        <CommandList>
          <CommandEmpty>No conversations yet.</CommandEmpty>
          <CommandGroup heading="Conversations">
            {threads.map((thread) => (
              <CommandItem
                key={thread.id}
                value={thread.title}
                onSelect={() => {
                  setHistoryModalOpen(false);
                  handleSelectThread(thread.id);
                }}
              >
                <HugeiconsIcon icon={MessageSquare} strokeWidth={2.25} className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>{thread.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
    </AiConfiguredGate>
  );
}

/** Today / Yesterday / Previous 7 days / Previous 30 days / Older, newest first. */
function groupThreadsByDate<T extends { updatedAt: string }>(threads: T[]): { label: string; threads: T[] }[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 24 * 60 * 60 * 1000;
  const labelFor = (updatedAt: string) => {
    const t = new Date(updatedAt).getTime();
    if (t >= startOfToday.getTime()) return "Today";
    if (t >= startOfToday.getTime() - day) return "Yesterday";
    if (t >= startOfToday.getTime() - 7 * day) return "Previous 7 days";
    if (t >= startOfToday.getTime() - 30 * day) return "Previous 30 days";
    return "Older";
  };
  const groups: { label: string; threads: T[] }[] = [];
  for (const thread of [...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    const label = labelFor(thread.updatedAt);
    const last = groups.at(-1);
    if (last?.label === label) last.threads.push(thread);
    else groups.push({ label, threads: [thread] });
  }
  return groups;
}
