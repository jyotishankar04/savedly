"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MessageSquareIcon as MessageSquare } from "@hugeicons/core-free-icons";
import { PaletteDialog } from "@/components/ui/palette-dialog";
import type { Thread } from "@/lib/ask";
import { groupThreadsByDate } from "@/lib/ask-results";

/** Opened via the floating dock's "Chat history" button (only shown
 * once the main sidebar is fully collapsed) — same thread list as
 * the on-page sidebar, just reachable when that sidebar has nowhere
 * to render. */
export function HistoryDialog({
  open,
  onOpenChange,
  threads,
  onNewChat,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threads: Thread[];
  onNewChat: () => void;
  onSelect: (threadId: string) => void;
}) {
  return (
      <PaletteDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Chat history"
        description="Jump to a previous conversation, or start a new one."
        placeholder="Search conversations…"
        items={[
          { id: "new", group: "Start", label: "New chat", keywords: ["start", "fresh", "ask"], icon: <HugeiconsIcon icon={MessageSquare} strokeWidth={2} className="h-4 w-4" /> },
          // Grouped the same way as the list beside the chat: Today, Yesterday, and so on.
          ...groupThreadsByDate(threads).flatMap((group) =>
            group.threads.map((thread) => ({
              id: `thread:${thread.id}`,
              group: group.label,
              label: thread.title,
              icon: <HugeiconsIcon icon={MessageSquare} strokeWidth={2} className="h-4 w-4" />,
            })),
          ),
        ]}
        onSelect={(item) => (item.id === "new" ? onNewChat() : onSelect(item.id.slice("thread:".length)))}
      />
  );
}
