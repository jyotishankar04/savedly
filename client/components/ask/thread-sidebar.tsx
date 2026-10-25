"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusIcon as Plus } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlidingHighlight } from "@/components/ui/gliding-highlight";
import { cn } from "@/lib/utils";
import type { Thread } from "@/lib/ask";
import { groupThreadsByDate } from "@/lib/ask-results";

/** Secondary sidebar — thread history, scoped to this page (not the
 * app's own nav sidebar). Collapsed away once the main sidebar is
 * fully collapsed — the floating dock's "New chat"/"Chat history"
 * buttons cover the same job at that point (see useSidebarState),
 * so keeping both just left this one stranded. */
export function ThreadSidebar({
  threads,
  threadsLoading,
  activeThreadId,
  collapsed,
  onNewChat,
  onSelect,
}: {
  threads: Thread[];
  threadsLoading: boolean;
  activeThreadId: string | null;
  collapsed: boolean;
  onNewChat: () => void;
  onSelect: (threadId: string) => void;
}) {
  return (
      <div
        className={cn(
          "hidden md:flex shrink-0 border-r border-border/20 flex-col h-full py-6 overflow-hidden transition-[width,opacity] duration-200",
          collapsed ? "w-0 opacity-0 pointer-events-none border-r-0" : "w-60 opacity-100",
        )}
      >
        <div className="px-4 pb-3 w-60">
          <Button variant="outline" className="h-10 w-full justify-start gap-2 rounded-xl px-3 text-sm font-medium" onClick={onNewChat}>
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
                <GlidingHighlight as="ul" aria-label={group.label} className="space-y-0.5">
                  {group.threads.map((thread) => {
                    const active = thread.id === activeThreadId;
                    return (
                      <li key={thread.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(thread.id)}
                          aria-current={active ? "page" : undefined}
                          data-nav-row=""
                          title={thread.title}
                          className={cn(
                            "relative z-[1] w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                            active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {thread.title}
                        </button>
                      </li>
                    );
                  })}
                </GlidingHighlight>
              </div>
            ))
          )}
        </ScrollArea>
      </div>
  );
}

/** Phones: the history column is hidden, so conversations are picked here instead. */
export function MobileThreadPicker({
  threads,
  activeThreadId,
  onNewChat,
  onSelect,
}: {
  threads: Thread[];
  activeThreadId: string | null;
  onNewChat: () => void;
  onSelect: (threadId: string) => void;
}) {
  return (
        <div className="md:hidden flex items-center gap-2 px-4 pb-3">
          <Select
            items={Object.fromEntries(threads.map((t) => [t.id, t.title]))}
            value={activeThreadId ?? ""}
            onValueChange={(v) => v && onSelect(v as string)}
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
          <Button variant={activeThreadId === null ? "default" : "outline"} size="sm" className="h-9 shrink-0 rounded-full gap-1.5 px-3.5 text-sm" onClick={onNewChat}>
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-3.5 w-3.5" /> New
          </Button>
        </div>
  );
}
