"use client";

import React from "react";
import Link from "next/link";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon as Close,
  Delete02Icon as Trash,
  Edit01Icon as Edit,
  LinkSquare02Icon as ExternalLink,
  StickyNote01Icon as Note,
  Calendar03Icon as CalendarIcon,
  Clock01Icon as Clock,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/calendar-api";
import { useDeleteCalendarEventMutation } from "@/hooks/use-calendar";
import { editTargetFor, formatEventWhen, providerName, SOURCE_LABEL } from "./calendar-utils";

export interface EventPopoverState {
  event: CalendarEvent;
  /**
   * Where the clicked event sat on screen. A snapshot rather than the
   * element itself: a refetch re-renders the grid and replaces the element,
   * which would send an element-anchored popover to the top-left corner.
   */
  rect: DOMRect;
}

function IconAction({ label, onClick, children, tone }: { label: string; onClick: () => void; children: React.ReactNode; tone?: "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none",
        tone === "danger" && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

export function EventPopover({
  state,
  onClose,
  onEdit,
}: {
  state: EventPopoverState | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
}) {
  const deleteMutation = useDeleteCalendarEventMutation();
  const [confirmingFor, setConfirmingFor] = React.useState<string | null>(null);

  const event = state?.event ?? null;
  const target = event ? editTargetFor(event) : null;
  const confirming = event !== null && confirmingFor === event.id;
  const anchor = React.useMemo(() => (state ? { getBoundingClientRect: () => state.rect } : null), [state]);

  async function handleRemove() {
    if (!event || !target) return;
    // Removing a note's event keeps the note; removing an event that only
    // lives on Google Calendar deletes it there, so that one asks first.
    if (target.kind === "external" && !confirming) {
      setConfirmingFor(event.id);
      return;
    }
    try {
      await deleteMutation.mutateAsync(target);
      toast.add({ title: target.kind === "memory" ? "Event removed. The note is still saved." : `Event deleted from ${providerName(target.provider)}`, type: "success" });
      onClose();
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't remove the event.", type: "error" });
    }
  }

  return (
    <PopoverPrimitive.Root
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) {
          setConfirmingFor(null);
          onClose();
        }
      }}
    >
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner anchor={anchor} side="right" align="start" sideOffset={8} collisionPadding={12} className="isolate z-50">
          <PopoverPrimitive.Popup
            aria-label={event?.title}
            className="relative w-[min(22rem,calc(100vw-24px))] origin-(--transform-origin) rounded-2xl bg-popover p-4 text-popover-foreground shadow-[0_16px_40px_-12px_rgb(0_0_0/0.25)] ring-1 ring-foreground/10 outline-hidden duration-150 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
          >
            {event && (
              <>
                <div className="-mt-1 -mr-1 flex items-center justify-end gap-0.5">
                  {target && (
                    <IconAction label="Edit event" onClick={() => onEdit(event)}>
                      <HugeiconsIcon icon={Edit} strokeWidth={2} className="size-4" />
                    </IconAction>
                  )}
                  {target && (
                    <IconAction label="Remove event" tone="danger" onClick={handleRemove}>
                      <HugeiconsIcon icon={Trash} strokeWidth={2} className="size-4" />
                    </IconAction>
                  )}
                  <PopoverPrimitive.Close
                    aria-label="Close"
                    className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  >
                    <HugeiconsIcon icon={Close} strokeWidth={2} className="size-4" />
                  </PopoverPrimitive.Close>
                </div>

                <div className="mt-1 flex gap-3">
                  <span
                    aria-hidden
                    className={cn("mt-1.5 size-3 shrink-0 rounded-[4px]", event.source === "saveforlatter" ? "bg-primary" : "bg-foreground/70")}
                  />
                  <div className="min-w-0 flex-1">
                    <PopoverPrimitive.Title className="text-[17px] leading-snug font-semibold tracking-[-0.01em] text-balance break-words text-foreground">
                      {event.title}
                    </PopoverPrimitive.Title>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground tabular-nums">
                      <HugeiconsIcon icon={Clock} strokeWidth={2} className="size-3.5 shrink-0" />
                      {formatEventWhen(event)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <HugeiconsIcon icon={event.source === "saveforlatter" ? Note : CalendarIcon} strokeWidth={2} className="size-3.5 shrink-0" />
                      {event.source === "saveforlatter" ? "Saved as a note" : event.memoryId ? `${SOURCE_LABEL[event.source]} · from a note` : SOURCE_LABEL[event.source]}
                    </p>
                  </div>
                </div>

                {event.description && (
                  <p className="mt-3 line-clamp-5 border-t border-foreground/8 pt-3 text-[13px] leading-relaxed whitespace-pre-line text-muted-foreground">
                    {event.description}
                  </p>
                )}

                {confirming ? (
                  <div className="mt-4 rounded-xl bg-destructive/8 p-3 ring-1 ring-destructive/20">
                    <p className="text-[13px] font-medium text-foreground">
                      Delete this event from {target?.kind === "external" ? providerName(target.provider) : "your calendar"}?
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">It isn&apos;t saved anywhere else in SaveForLatter.</p>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 rounded-full px-3" onClick={() => setConfirmingFor(null)}>
                        Keep it
                      </Button>
                      <Button variant="destructive" size="sm" className="h-8 rounded-full px-3" disabled={deleteMutation.isPending} onClick={handleRemove}>
                        {deleteMutation.isPending ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  (event.htmlLink || event.memoryId) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {event.memoryId && (
                        <Button
                          render={<Link href={`/app/memories/${event.memoryId}`} />}
                          nativeButton={false}
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full px-3 text-[13px]"
                        >
                          <HugeiconsIcon icon={Note} strokeWidth={2} className="size-3.5" /> Open note
                        </Button>
                      )}
                      {event.htmlLink && event.source !== "saveforlatter" && (
                        <Button
                          render={<a href={event.htmlLink} target="_blank" rel="noreferrer" />}
                          nativeButton={false}
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full px-3 text-[13px]"
                        >
                          Open in {providerName(event.source)} <HugeiconsIcon icon={ExternalLink} strokeWidth={2} className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                )}
              </>
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
