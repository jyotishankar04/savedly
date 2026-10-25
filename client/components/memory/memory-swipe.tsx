"use client";

import {
  Archive01Icon as ArchiveIcon,
  ArchiveArrowUpIcon as UnarchiveIcon,
  Mail01Icon as UnreadIcon,
  MailOpen01Icon as ReadIcon,
} from "@hugeicons/core-free-icons";
import { SwipeRow } from "@/components/swipe-row";
import { toast } from "@/components/ui/toast";
import { useMarkRead } from "@/components/memory/remind-me";
import { useUpdateMemoryMutation } from "@/context/MemoryContext";
import type { Memory } from "@/types/memory";

/**
 * The phone gestures on a memory in a list (roadmap: "Gestures on your
 * phone"): swipe right to mark it read (or unread), swipe left to archive it
 * (or, in the archive, bring it back). Each one can be undone from the toast
 * it shows. Touch only; the same actions are in the item's ⋯ menu.
 */
export function MemorySwipe({
  memory,
  disabled,
  className,
  children,
}: {
  memory: Pick<Memory, "id" | "title" | "readAt" | "isArchived" | "remindAt">;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const markRead = useMarkRead();
  const update = useUpdateMemoryMutation();

  const setArchived = (archived: boolean, withUndo: boolean) =>
    update.mutate(
      { id: memory.id, patch: { isArchived: archived } },
      {
        onSuccess: () => {
          if (!withUndo) return;
          toast.add({
            title: archived ? "Archived" : "Restored from archive",
            description: memory.title,
            type: "success",
            action: { label: "Undo", onClick: () => setArchived(!archived, false) },
          });
        },
        onError: () => toast.add({ title: "That didn't work. Try again.", type: "error" }),
      },
    );

  return (
    <SwipeRow
      disabled={disabled}
      className={className}
      swipeRight={{
        label: memory.readAt ? "Unread" : "Read",
        icon: memory.readAt ? UnreadIcon : ReadIcon,
        tone: "primary",
        // The read toast brings its own Undo.
        run: () => void markRead.mark([memory], !memory.readAt),
      }}
      swipeLeft={{
        label: memory.isArchived ? "Restore" : "Archive",
        icon: memory.isArchived ? UnarchiveIcon : ArchiveIcon,
        tone: "amber",
        leaves: true,
        run: () => setArchived(!memory.isArchived, true),
      }}
    >
      {children}
    </SwipeRow>
  );
}
