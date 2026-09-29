"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useMemoryQuery, useUpdateMemoryMutation } from "@/context/MemoryContext";
import { useDeleteNotificationMutation, useMarkReadMutation } from "@/hooks/use-notifications";
import { eventDetectedRefs, type AppNotification } from "@/lib/notifications";
import { AddToCalendarDialog } from "./add-to-calendar-dialog";
import { useNextStep } from "nextstepjs";

interface EventDetectedPopupProps {
  notification: AppNotification;
  onClose: () => void;
}

/**
 * The confirm-then-commit wrapper for an AI-detected event, shared by the
 * notifications page's inline action and AppShell's live popup. This is
 * the ONLY place a DetectEvent guess (memories.suggestedEventAt) is ever
 * written into the real, user-owned memories.eventAt — via the normal
 * updateMemory path, and only after an explicit "Yes, add it" click.
 */
export function EventDetectedPopup({ notification, onClose }: EventDetectedPopupProps) {
  const refs = eventDetectedRefs(notification);
  const { data: memory } = useMemoryQuery(refs?.memoryId ?? "", { enabled: Boolean(refs) });
  const updateMutation = useUpdateMemoryMutation();
  const markRead = useMarkReadMutation();
  const remove = useDeleteNotificationMutation();
  const [confirmed, setConfirmed] = React.useState(false);

  if (!refs) return null;

  function markSeen() {
    if (!notification.readAt) markRead.mutate(notification.id);
  }

  async function confirm() {
    try {
      await updateMutation.mutateAsync({ id: refs!.memoryId, patch: { eventAt: refs!.suggestedEventAt } });
      setConfirmed(true);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't save the event date.", type: "error" });
    } finally {
      markSeen();
    }
  }

  // Closing with X or Esc only marks it seen, so the suggestion stays available.
  function dismiss() {
    markSeen();
    onClose();
  }

  // "Not an event" is an answer, so the suggestion goes away for good.
  function notAnEvent() {
    remove.mutate(notification.id);
    onClose();
  }

  if (confirmed) {
    return (
      <AddToCalendarDialog
        memory={{
          id: refs.memoryId,
          title: memory?.title ?? "Event",
          description: memory?.description ?? null,
          url: memory?.url ?? null,
          eventAt: refs.suggestedEventAt,
        }}
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      />
    );
  }

  const start = new Date(refs.suggestedEventAt);

  return (
    <Dialog open onOpenChange={(open) => !open && dismiss()}>
      <DialogContent className="sm:max-w-md gap-6 p-6">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-lg font-semibold tracking-tight">Is this an event?</DialogTitle>
          <DialogDescription className="text-sm">We spotted a date in something you saved.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-xl bg-muted/40 p-3.5">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[14px] border border-border bg-background">
            <span className="text-[10px] font-semibold uppercase leading-none tracking-wider text-primary">
              {start.toLocaleString(undefined, { month: "short" })}
            </span>
            <span className="mt-0.5 text-xl font-semibold leading-none tabular-nums text-foreground">{start.getDate()}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{memory?.title ?? "This memory"}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {start.toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">Add it to your calendar?</p>

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={remove.isPending} onClick={notAnEvent} className="h-10 rounded-full px-5 text-sm text-muted-foreground">
            Not an event
          </Button>
          <Button type="button" disabled={updateMutation.isPending} onClick={confirm} className="h-10 rounded-full px-6 text-sm">
            {updateMutation.isPending ? "Saving…" : "Yes, add it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * AppShell's live popup, held back while the product tour is on screen: the
 * tour's overlay sits above every dialog and swallows its clicks, so the
 * popup would show but "Yes, add it" couldn't be pressed. It appears as
 * soon as the tour is finished or skipped. Must render inside NextStepProvider.
 */
export function LiveEventDetectedPopup(props: EventDetectedPopupProps) {
  const { isNextStepVisible } = useNextStep();
  if (isNextStepVisible) return null;
  return <EventDetectedPopup {...props} />;
}
