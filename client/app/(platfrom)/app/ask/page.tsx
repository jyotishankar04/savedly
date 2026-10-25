"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Message, MessageContent } from "@/components/ui/message";
import { askStreamUrl, getThreadMessages } from "@/lib/ask";
import {
  threadMessagesQueryKey,
  useCreateThreadMutation,
  useThreadMessagesQuery,
  useThreadsQuery,
} from "@/context/AskContext";
import { useSidebarState } from "@/context/SidebarContext";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { AiConfiguredGate } from "@/components/ai-configured-gate";
import { AskEmptyState } from "@/components/ask/ask-empty-state";
import { ChatMessage } from "@/components/ask/chat-message";
import { Composer } from "@/components/ask/composer";
import { HistoryDialog } from "@/components/ask/history-dialog";
import { SourcesPanel } from "@/components/ask/search-results";
import { MobileThreadPicker, ThreadSidebar } from "@/components/ask/thread-sidebar";
import { getCurrentSources, toInitialMessages } from "@/lib/ask-results";

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

  // The main app sidebar's floating dock (components/app-shell/floating-dock.tsx)
  // gains a "New chat"/"Chat history" pair once it's fully collapsed and
  // this page is active — the on-page thread sidebar has nowhere good to
  // dock at that point. The shell can't call this page's handlers directly
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
      <ThreadSidebar
        threads={threads}
        threadsLoading={threadsLoading}
        activeThreadId={activeThreadId}
        collapsed={mainSidebarCollapsed}
        onNewChat={handleNewChat}
        onSelect={handleSelectThread}
      />

      {/* Main conversation column */}
      <div className="flex-1 min-w-0 flex flex-col h-full py-4 md:py-6">
        <MobileThreadPicker threads={threads} activeThreadId={activeThreadId} onNewChat={handleNewChat} onSelect={handleSelectThread} />
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="flex-1 min-h-0">
            <MessageScrollerViewport>
              <MessageScrollerContent className="max-w-4xl mx-auto w-full px-4 md:px-6">
                {messages.length === 0 && <AskEmptyState onPick={send} disabled={isBusy || queryLimit.isAtLimit} />}

                {messages.map((message, messageIndex) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLastMessage={messageIndex === messages.length - 1}
                    isBusy={isBusy}
                    send={send}
                    limitReached={queryLimit.isAtLimit}
                  />
                ))}

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

        <Composer input={input} setInput={setInput} onSubmit={handleSubmit} isBusy={isBusy} queryLimit={queryLimit} />
      </div>

      {currentSources && (
        <SourcesPanel memories={currentSources} open={sourcesOpen} onToggle={() => setSourcesOpen((v) => !v)} />
      )}

      <HistoryDialog open={historyModalOpen} onOpenChange={setHistoryModalOpen} threads={threads} onNewChat={handleNewChat} onSelect={handleSelectThread} />
    </div>
    </AiConfiguredGate>
  );
}
