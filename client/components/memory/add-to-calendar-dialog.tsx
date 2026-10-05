"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon as CalendarIcon,
  Delete02Icon as Trash2,
  CloudDownloadIcon as Download,
  ExternalLinkIcon as ExternalLink,
  CheckmarkCircle02Icon as CheckCircle,
  ArrowRight01Icon as ArrowRight,
} from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useUpdateMemoryMutation } from "@/context/MemoryContext";
import { buildIcsContent, downloadTextFile, googleCalendarUrl } from "@/lib/calendar";
import { useQuery } from "@tanstack/react-query";
import { getCalendarConnectUrl, type CalendarProviderKey } from "@/lib/calendar-api";
import { getServerConfig } from "@/lib/server-config";
import { useCalendarConnectionsQuery, usePushToCalendarMutation } from "@/hooks/use-calendar";
import type { Memory } from "@/types/memory";

interface AddToCalendarDialogProps {
  memory: Pick<Memory, "id" | "title" | "description" | "url" | "eventAt">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Local datetime-local input value ("YYYY-MM-DDTHH:mm") from an ISO string, in the viewer's own timezone. */
const PROVIDER_LABEL: Record<CalendarProviderKey, string> = { google: "Google Calendar" };

/** A row in the "add it yourself" list: quiet, because the direct sync above is the better path when it's available. */
const manualRowClass =
  "flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none";

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function AddToCalendarDialog({ memory, open, onOpenChange }: AddToCalendarDialogProps) {
  const updateMutation = useUpdateMemoryMutation();
  const { data: connections } = useCalendarConnectionsQuery();
  const pushMutation = usePushToCalendarMutation();
  const [draft, setDraft] = React.useState(() => (memory.eventAt ? toLocalInputValue(memory.eventAt) : ""));

  const [addedTo, setAddedTo] = React.useState<CalendarProviderKey[]>([]);

  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(memory.eventAt ? toLocalInputValue(memory.eventAt) : "");
      setAddedTo([]);
    }
  }

  async function saveDate(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || updateMutation.isPending) return;
    try {
      await updateMutation.mutateAsync({ id: memory.id, patch: { eventAt: new Date(draft).toISOString() } });
      toast.add({ title: "Event date saved", type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't save the event date.", type: "error" });
    }
  }

  async function removeEvent() {
    try {
      await updateMutation.mutateAsync({ id: memory.id, patch: { eventAt: null } });
      toast.add({ title: "Event removed", type: "success" });
      onOpenChange(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't remove the event.", type: "error" });
    }
  }

  const eventInput = memory.eventAt
    ? { title: memory.title, description: memory.description, url: memory.url, start: memory.eventAt }
    : null;

  function isConnected(provider: CalendarProviderKey): boolean {
    return connections?.some((c) => c.provider === provider) ?? false;
  }

  async function pushToCalendar(provider: CalendarProviderKey) {
    try {
      await pushMutation.mutateAsync({ memoryId: memory.id, provider });
      setAddedTo((prev) => [...prev, provider]);
      toast.add({ title: "Added to Google Calendar", type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't create the calendar event.", type: "error" });
    }
  }

  const start = memory.eventAt ? new Date(memory.eventAt) : null;
  const anyConnected = (["google"] as const).some(isConnected);
  const { data: serverConfig } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig });
  const calendarOpen = serverConfig?.googleCalendar ?? true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-6 p-6">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-lg font-semibold tracking-tight">Add to calendar</DialogTitle>
          <DialogDescription className="text-sm">
            {eventInput ? "Pick where this event should go." : "When does this happen?"}
          </DialogDescription>
        </DialogHeader>

        {!eventInput ? (
          <form onSubmit={saveDate} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="event-date" className="text-sm font-medium text-foreground">
                Date &amp; time
              </label>
              <Input id="event-date" type="datetime-local" value={draft} onChange={(e) => setDraft(e.target.value)} required className="h-10" />
              <p className="truncate text-xs text-muted-foreground">For &ldquo;{memory.title}&rdquo;</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-10 rounded-full px-5 text-sm">
                Cancel
              </Button>
              <Button type="submit" disabled={!draft || updateMutation.isPending} className="h-10 rounded-full px-6 text-sm">
                {updateMutation.isPending ? "Saving…" : "Continue"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-6">
            {/* The event itself: a date tile, the title, and the time. */}
            <div className="flex items-center gap-4 rounded-xl bg-muted/40 p-3.5">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[14px] border border-border bg-background">
                <span className="text-[10px] font-semibold uppercase leading-none tracking-wider text-primary">
                  {start!.toLocaleString(undefined, { month: "short" })}
                </span>
                <span className="mt-0.5 text-xl font-semibold leading-none tabular-nums text-foreground">{start!.getDate()}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{memory.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {start!.toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>

            <section aria-labelledby="cal-direct" className="space-y-2.5">
              <h3 id="cal-direct" className="text-sm font-medium text-foreground">
                {anyConnected ? "Add to your calendar" : "Sync directly"}
              </h3>
              <div className="space-y-2">
                {(["google"] as const).map((provider) => {
                  const label = PROVIDER_LABEL[provider];
                  const added = addedTo.includes(provider);
                  return isConnected(provider) ? (
                    <Button
                      key={provider}
                      disabled={pushMutation.isPending || added}
                      onClick={() => pushToCalendar(provider)}
                      className={cn("h-11 w-full justify-between rounded-xl px-4 text-sm font-medium", added && "disabled:opacity-100")}
                    >
                      <span className="flex items-center gap-2.5">
                        <HugeiconsIcon icon={added ? CheckCircle : CalendarIcon} strokeWidth={2} className="h-[18px] w-[18px]" />
                        {added ? `Added to ${label}` : `Add to ${label}`}
                      </span>
                      {!added && <span className="text-xs font-normal opacity-80">Connected</span>}
                    </Button>
                  ) : !calendarOpen ? (
                    <p key={provider} className="rounded-xl border border-dashed border-border px-4 py-3 text-[13px] leading-snug text-muted-foreground">
                      <span className="font-medium text-foreground">{label} is coming soon.</span> We&apos;re going through Google&apos;s verification for
                      calendar access. Until then, use a link or the file below.
                    </p>
                  ) : (
                    <Button
                      key={provider}
                      variant="outline"
                      nativeButton={false}
                      className="h-11 w-full justify-between rounded-xl px-4 text-sm font-medium"
                      render={<a href={getCalendarConnectUrl(provider)} />}
                    >
                      <span className="flex items-center gap-2.5">
                        <HugeiconsIcon icon={CalendarIcon} strokeWidth={2} className="h-[18px] w-[18px] text-muted-foreground" />
                        Connect {label}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                        Sync automatically
                        <HugeiconsIcon icon={ArrowRight} strokeWidth={2} className="h-3.5 w-3.5" />
                      </span>
                    </Button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="cal-manual" className="space-y-2.5">
              <h3 id="cal-manual" className="text-sm font-medium text-foreground">
                Or add it yourself
              </h3>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                <a href={googleCalendarUrl(eventInput)} target="_blank" rel="noreferrer" className={manualRowClass}>
                  <HugeiconsIcon icon={ExternalLink} strokeWidth={2} className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">Google Calendar link</span>
                </a>
                <button
                  type="button"
                  className={manualRowClass}
                  onClick={() => downloadTextFile(`${memory.title.slice(0, 60) || "event"}.ics`, buildIcsContent(eventInput))}
                >
                  <HugeiconsIcon icon={Download} strokeWidth={2} className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">Download .ics file</span>
                  <span className="text-xs text-muted-foreground">Apple and others</span>
                </button>
              </div>
            </section>

            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={updateMutation.isPending}
                onClick={removeEvent}
                className="h-10 rounded-full px-4 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <HugeiconsIcon icon={Trash2} strokeWidth={2} className="h-4 w-4" /> Remove event
              </Button>
              <Button type="button" variant={addedTo.length > 0 ? "default" : "outline"} onClick={() => onOpenChange(false)} className="h-10 rounded-full px-7 text-sm">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
