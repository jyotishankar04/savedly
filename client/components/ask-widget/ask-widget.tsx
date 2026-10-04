"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Streamdown } from "streamdown";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon as ArrowUp,
  Layout01Icon as SidebarIcon,
  MultiplicationSignIcon as CloseX,
  PlusIcon as Plus,
  Search01Icon as Search,
  SquareIcon as PopupIcon,
  UnfoldMoreIcon as Expand,
} from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askStreamUrl } from "@/lib/ask";
import { useCreateThreadMutation } from "@/context/AskContext";
import { AiConfiguredGate } from "@/components/ai-configured-gate";
import { cn } from "@/lib/utils";
import { HelpActions } from "@/components/ask/help-actions";
import { AskEmptyState } from "@/components/ask/ask-empty-state";
import { toolActivityLabel } from "@/lib/ask-tools";
import { EventResultCard, isEventToolName, parseEventToolOutput } from "@/components/ask/event-result-card";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";

type WidgetMode = "popup" | "sidebar";

const MODE_STORAGE_KEY = "saveforlatter:ask-widget-mode";
const POPUP_SIZE_KEY = "saveforlatter:ask-widget-popup-size";
const SIDEBAR_WIDTH_KEY = "saveforlatter:ask-widget-sidebar-width";

const DEFAULT_POPUP_SIZE = { width: 384, height: 544 };
const MIN_POPUP_WIDTH = 320;
const MIN_POPUP_HEIGHT = 380;
const DEFAULT_SIDEBAR_WIDTH = 420;

/** The launcher is a 56px circle anchored where the popup's bottom-right corner sits, so the popup grows out of its center. */
const LAUNCHER_CENTER = "calc(100% - 28px) calc(100% - 28px)";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN = [0.7, 0, 0.84, 0] as const;
const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 720;

function readStoredMode(): WidgetMode {
  if (typeof window === "undefined") return "popup";
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    return stored === "sidebar" ? "sidebar" : "popup";
  } catch {
    return "popup";
  }
}

function readStoredPopupSize(): { width: number; height: number } {
  if (typeof window === "undefined") return DEFAULT_POPUP_SIZE;
  try {
    const raw = window.localStorage.getItem(POPUP_SIZE_KEY);
    if (!raw) return DEFAULT_POPUP_SIZE;
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_POPUP_SIZE>;
    return {
      width: typeof parsed.width === "number" ? parsed.width : DEFAULT_POPUP_SIZE.width,
      height: typeof parsed.height === "number" ? parsed.height : DEFAULT_POPUP_SIZE.height,
    };
  } catch {
    return DEFAULT_POPUP_SIZE;
  }
}

function readStoredSidebarWidth(): number {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
  try {
    const parsed = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

interface SearchMemoriesResult {
  query: string;
  memories: { id: string; title: string }[];
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

/**
 * Quick-access floating Ask widget — mounted once in the app shell
 * (app/(platfrom)/app/layout.tsx), available from every /app page except
 * /app/ask itself (the dedicated page already *is* the Ask experience, and
 * showing both at once would be redundant — see the pathname check below).
 * Deliberately a simplified surface (no thread-history sidebar, sources
 * panel, or resumable-thread switching) — those stay on the full page,
 * reachable via the "Open full page" link in the widget's header. Both
 * surfaces write to the same thread/message backend, so nothing started
 * here is lost; it's just browsed from the richer page instead.
 */
export function AskWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  // Lazy-initialized from localStorage rather than restored in an effect:
  // the widget is only ever mounted closed (isOpen starts false, and mode/
  // popupSize/sidebarWidth don't affect anything rendered until the user
  // opens it), so there's no server/client markup to mismatch.
  const [mode, setMode] = useState<WidgetMode>(readStoredMode);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const pendingMessageRef = useRef<string | null>(null);
  const createThreadMutation = useCreateThreadMutation();

  const [popupSize, setPopupSize] = useState(readStoredPopupSize);
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const setModeAndPersist = (next: WidgetMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Best-effort — the mode just won't survive a reload if storage is unavailable.
    }
  };

  // Popup is anchored to the bottom-right corner, so its resize handle sits
  // at the top-left — dragging up/left (negative delta from the pointer's
  // perspective) grows the panel, which is why dx/dy are start-minus-current
  // rather than the more usual current-minus-start.
  function handlePopupResizeStart(e: React.PointerEvent) {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width: popupSize.width, height: popupSize.height };
    window.addEventListener("pointermove", handlePopupResizeMove);
    window.addEventListener("pointerup", handlePopupResizeEnd);
  }
  function handlePopupResizeMove(e: PointerEvent) {
    const start = resizeStartRef.current;
    if (!start) return;
    const maxWidth = window.innerWidth - 32;
    const maxHeight = window.innerHeight - 120;
    setPopupSize({
      width: Math.min(maxWidth, Math.max(MIN_POPUP_WIDTH, start.width + (start.x - e.clientX))),
      height: Math.min(maxHeight, Math.max(MIN_POPUP_HEIGHT, start.height + (start.y - e.clientY))),
    });
  }
  function handlePopupResizeEnd() {
    resizeStartRef.current = null;
    window.removeEventListener("pointermove", handlePopupResizeMove);
    window.removeEventListener("pointerup", handlePopupResizeEnd);
    setPopupSize((size) => {
      try {
        window.localStorage.setItem(POPUP_SIZE_KEY, JSON.stringify(size));
      } catch {
        // Best-effort — the size just won't survive a reload if storage is unavailable.
      }
      return size;
    });
  }

  // Sidebar is anchored to the right edge — its handle is the left edge,
  // width-only, same "dragging toward the anchor grows it" logic as popup.
  function handleSidebarResizeStart(e: React.PointerEvent) {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, y: 0, width: sidebarWidth, height: 0 };
    window.addEventListener("pointermove", handleSidebarResizeMove);
    window.addEventListener("pointerup", handleSidebarResizeEnd);
  }
  function handleSidebarResizeMove(e: PointerEvent) {
    const start = resizeStartRef.current;
    if (!start) return;
    const maxWidth = Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - 32);
    setSidebarWidth(Math.min(maxWidth, Math.max(MIN_SIDEBAR_WIDTH, start.width + (start.x - e.clientX))));
  }
  function handleSidebarResizeEnd() {
    resizeStartRef.current = null;
    window.removeEventListener("pointermove", handleSidebarResizeMove);
    window.removeEventListener("pointerup", handleSidebarResizeEnd);
    setSidebarWidth((width) => {
      try {
        window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
      } catch {
        // Best-effort — the width just won't survive a reload if storage is unavailable.
      }
      return width;
    });
  }

  // The dedicated /app/ask page already IS this experience — never show
  // both. Closing (not just hiding) on navigation there means reopening
  // the widget later starts clean rather than resuming mid-thread behind
  // the scenes.
  const onAskPage = pathname === "/app/ask";
  useEffect(() => {
    // Resets local widget state in response to the route changing (an
    // external system, from this component's perspective) — not a
    // redundant render-time computation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (onAskPage) setIsOpen(false);
  }, [onAskPage]);

  const transport = useMemo(() => {
    if (!threadId) return undefined;
    return new DefaultChatTransport({
      api: askStreamUrl(threadId),
      credentials: "include",
      prepareSendMessagesRequest: ({ messages }) => {
        const last = messages[messages.length - 1];
        const text =
          last?.parts?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text").map((p) => p.text).join("") ?? "";
        return { body: { query: text }, credentials: "include" };
      },
    });
  }, [threadId]);

  const { messages, sendMessage, setMessages, status } = useChat({ id: threadId ?? "widget-new", transport });

  useEffect(() => {
    if (threadId && pendingMessageRef.current && transport) {
      const text = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessage({ text });
    }
  }, [threadId, transport, sendMessage]);

  const isBusy = status === "streaming" || status === "submitted";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await send(input);
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || isBusy) return;
    setInput("");

    if (!threadId) {
      pendingMessageRef.current = text;
      const thread = await createThreadMutation.mutateAsync(text.slice(0, 60));
      setThreadId(thread.id);
    } else {
      sendMessage({ text });
    }
  }

  function handleNewChat() {
    setThreadId(null);
    setMessages([]);
    setInput("");
  }

  if (onAskPage) return null;

  // The reveal is driven by --reveal (0 closed, 1 open) instead of a clip-path
  // radius, so resizing the open popup never lags behind a re-animating clip.
  const popupRadius = Math.hypot(popupSize.width, popupSize.height) + 48;
  const clipPath =
    mode === "popup"
      ? `circle(calc(28px + var(--reveal) * ${popupRadius - 28}px) at ${LAUNCHER_CENTER})`
      : "inset(0 0 0 calc((1 - var(--reveal)) * 100%))";

  return (
    <AnimatePresence initial={false}>
      {!isOpen ? (
        <motion.button
          key="launcher"
          onClick={() => setIsOpen(true)}
          aria-label="Ask SaveForLatter"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0, transition: { duration: reduceMotion ? 0.15 : 0.45, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.18 } }}
          exit={reduceMotion ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, scale: 0.4, transition: { duration: 0.18, ease: EASE_IN } }}
          whileHover={reduceMotion ? undefined : { y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
          className="group fixed max-md:hidden md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full bg-background ring-1 ring-foreground/10 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <LogoMark className="h-10 w-10 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
        </motion.button>
      ) : (
    <motion.div
      key="panel"
      role="dialog"
      aria-label="Ask SaveForLatter"
      initial={reduceMotion ? { opacity: 0 } : { "--reveal": 0, opacity: 1 }}
      animate={reduceMotion ? { opacity: 1, transition: { duration: 0.15 } } : { "--reveal": 1, opacity: 1, transition: { duration: mode === "popup" ? 0.6 : 0.45, ease: EASE_OUT } }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.12 } }
          : { "--reveal": 0, opacity: mode === "popup" ? 0.6 : 1, transition: { duration: mode === "popup" ? 0.32 : 0.28, ease: EASE_IN } }
      }
      className={cn(
        "fixed z-40 flex flex-col bg-background border border-border shadow-2xl overflow-hidden",
        mode === "popup" ? "bottom-20 right-4 md:bottom-6 md:right-6 rounded-2xl" : "inset-y-0 right-0 border-l",
      )}
      style={{
        ...(mode === "popup"
          ? { width: popupSize.width, height: popupSize.height, maxWidth: "calc(100vw - 2rem)", maxHeight: "calc(100vh - 8rem)" }
          : { width: sidebarWidth, maxWidth: "calc(100vw - 1rem)" }),
        ...(reduceMotion ? {} : { clipPath }),
      }}
    >
      {/* Resize handle — top-left corner in popup mode (anchored bottom-right,
          so growing toward the corner is the natural direction), left edge
          in sidebar mode (anchored to the right edge, width-only). */}
      {mode === "popup" ? (
        <div
          onPointerDown={handlePopupResizeStart}
          className="absolute top-0 left-0 h-5 w-5 cursor-nwse-resize z-10 touch-none"
          aria-hidden
        />
      ) : (
        <div
          onPointerDown={handleSidebarResizeStart}
          className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize z-10 touch-none hover:bg-primary/30 transition-colors"
          aria-hidden
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <LogoMark ticks={false} className="h-7 w-7" />
          <span className="text-sm font-semibold text-foreground truncate">Ask SaveForLatter</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon-sm" title="New chat" onClick={handleNewChat}>
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title={mode === "popup" ? "Dock as sidebar" : "Float as popup"}
            onClick={() => setModeAndPersist(mode === "popup" ? "sidebar" : "popup")}
          >
            <HugeiconsIcon icon={mode === "popup" ? SidebarIcon : PopupIcon} strokeWidth={2.25} className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Open full page" render={<Link href="/app/ask" />} nativeButton={false}>
            <HugeiconsIcon icon={Expand} strokeWidth={2.25} className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Close" onClick={() => setIsOpen(false)}>
            <HugeiconsIcon icon={CloseX} strokeWidth={2.25} className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <AiConfiguredGate className="flex-1 min-h-0 flex flex-col">
      {/* Messages */}
      {/* Same scroller as the full Ask page: shadcn's thin scrollbar, and it follows a streaming answer. */}
      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className="flex-1 min-h-0">
      <MessageScrollerViewport>
      <MessageScrollerContent className="gap-4 px-4 py-4">
        {messages.length === 0 && <AskEmptyState compact onPick={send} disabled={isBusy} />}

        {messages.map((message, messageIndex) => {
          const isLastMessage = messageIndex === messages.length - 1;
          const isUser = message.role === "user";
          const hasText = message.parts.some((p) => p.type === "text" && p.text);
          return (
            <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={isUser}>
            <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {message.parts.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    return isUser ? (
                      <span key={i}>{part.text}</span>
                    ) : (
                      <Streamdown
                        key={i}
                        isAnimating={isBusy && isLastMessage}
                        // The popup is narrow: page-sized markdown headings swamp it.
                        className="text-sm leading-relaxed [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h4]:text-sm [&_li]:my-0.5 [&_ol]:my-1.5 [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:pl-5"
                      >
                        {part.text}
                      </Streamdown>
                    );
                  }
                  if (part.type === "dynamic-tool" && part.toolName === "get_platform_help" && (part.state === "input-streaming" || part.state === "input-available")) {
                    return (
                      <div key={i} className="text-[11px] text-muted-foreground shimmer">
                        Checking the Help Center…
                      </div>
                    );
                  }
                  if (part.type === "dynamic-tool" && (part.toolName === "search_memories" || part.toolName === "search_memories_by_date")) {
                    if (part.state === "input-streaming" || part.state === "input-available") {
                      return (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground shimmer">
                          <HugeiconsIcon icon={Search} strokeWidth={2.25} className="h-3 w-3" />
                          Searching your memories…
                        </div>
                      );
                    }
                    if (part.state === "output-available") {
                      const result = parseToolOutput(part.output);
                      if (!result) return null;
                      return (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <HugeiconsIcon icon={Search} strokeWidth={2.25} className="h-3 w-3" />
                          {result.memories.length > 0
                            ? `Found ${result.memories.length} matching ${result.memories.length === 1 ? "memory" : "memories"}`
                            : "No matching memories found"}
                        </div>
                      );
                    }
                  }
                  if (
                    part.type === "dynamic-tool" &&
                    (part.state === "input-streaming" || part.state === "input-available") &&
                    toolActivityLabel(part.toolName)
                  ) {
                    return (
                      <div key={i} className="text-[11px] text-muted-foreground shimmer">
                        {toolActivityLabel(part.toolName)}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              {/* An event Ask added or moved: a card with buttons to open it. */}
              {!isUser &&
                message.parts.map((part, i) => {
                  if (part.type !== "dynamic-tool" || !isEventToolName(part.toolName) || part.state !== "output-available") return null;
                  const event = parseEventToolOutput(part.output);
                  return event ? (
                    <div key={`event-${i}`} className="max-w-[92%]" onClick={() => setIsOpen(false)}>
                      <EventResultCard event={event} compact />
                    </div>
                  ) : null;
                })}
              {!isUser && hasText && !(isBusy && isLastMessage) && (
                <div className="max-w-[92%]">
                  <HelpActions parts={message.parts} compact onNavigate={() => setIsOpen(false)} />
                </div>
              )}
            </div>
            </MessageScrollerItem>
          );
        })}

        {status === "submitted" && (
          <div className="flex justify-start">
            <span className="text-sm text-muted-foreground shimmer px-1">Thinking…</span>
          </div>
        )}
      </MessageScrollerContent>
      </MessageScrollerViewport>
      </MessageScroller>
      </MessageScrollerProvider>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border/60 shrink-0">
        <div className="rounded-2xl border border-border bg-card shadow-sm transition-colors focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask anything…"
            rows={1}
            className="min-h-[44px] max-h-36 resize-none border-none bg-transparent px-3.5 pt-3 pb-1 text-sm leading-relaxed shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:border-none focus-visible:ring-0 dark:bg-transparent"
            disabled={isBusy}
          />
          <div className="flex items-center justify-end px-2 pb-2">
            <Button
              type="submit"
              size="icon-sm"
              aria-label="Send"
              className="h-8 w-8 shrink-0 rounded-full disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
              disabled={isBusy || !input.trim()}
            >
              <HugeiconsIcon icon={ArrowUp} strokeWidth={2.25} className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
      </AiConfiguredGate>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
