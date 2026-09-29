"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarScheduler } from "@/components/ui/calendar-scheduler";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import type { CalendarEvent } from "@/lib/calendar-api";
import { useCreateCalendarEventMutation, useUpdateCalendarEventMutation } from "@/hooks/use-calendar";
import { editTargetFor, providerName } from "./calendar-utils";

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

/** Title, description, and schedule: the fields New event and Edit event share, so the two can't drift apart. */
function EventFields({
  title,
  onTitle,
  description,
  onDescription,
  start,
  onStart,
  duration,
  onDuration,
  titlePlaceholder,
}: {
  title: string;
  onTitle: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  start: Date;
  onStart: (d: Date) => void;
  duration: number;
  onDuration: (m: number) => void;
  titlePlaceholder?: string;
}) {
  return (
    <ScrollArea className="min-h-0" viewportClassName="max-h-[58dvh] pr-3">
      <div className="space-y-6 pb-1">
        <div className="space-y-2">
          <FieldLabel htmlFor="event-title">Title</FieldLabel>
          <Input id="event-title" value={title} onChange={(e) => onTitle(e.target.value)} required autoFocus className="h-10 text-sm" placeholder={titlePlaceholder} />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="event-description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea
            id="event-description"
            value={description}
            onChange={(e) => onDescription(e.target.value)}
            rows={3}
            placeholder="Add details, a link, or notes"
            className="max-h-40 resize-none text-sm leading-relaxed"
          />
        </div>

        <div className="space-y-3">
          <FieldLabel>When</FieldLabel>
          <CalendarScheduler value={start} onChange={onStart} duration={duration} onDurationChange={onDuration} className="-mx-2" />
        </div>
      </div>
    </ScrollArea>
  );
}

export interface NewEventDraft {
  start: Date;
  durationMinutes: number;
}

export function NewEventDialog({
  draft,
  onOpenChange,
}: {
  /** Opens the dialog seeded with this start and length; null closes it. */
  draft: NewEventDraft | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateCalendarEventMutation();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDraft, setStartDraft] = React.useState(() => draft?.start ?? new Date());
  const [durationMinutes, setDurationMinutes] = React.useState(60);

  const [seeded, setSeeded] = React.useState<NewEventDraft | null>(null);
  if (draft && draft !== seeded) {
    setSeeded(draft);
    setTitle("");
    setDescription("");
    setStartDraft(draft.start);
    setDurationMinutes(draft.durationMinutes);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || createMutation.isPending) return;

    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: startDraft.toISOString(),
        durationMinutes,
      });
      const synced = result.pushedTo.length > 0 ? ` and added to ${result.pushedTo.map(providerName).join(" and ")}` : "";
      toast.add({ title: `Event saved${synced}`, type: "success" });
      onOpenChange(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't create the event.", type: "error" });
    }
  }

  return (
    <Dialog open={draft !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] gap-5 p-6 sm:max-w-lg">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-lg font-semibold tracking-tight">New event</DialogTitle>
          <DialogDescription className="text-sm">Saved as a note, and added to any calendar you&apos;ve connected.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-5">
          <EventFields
            title={title}
            onTitle={setTitle}
            description={description}
            onDescription={setDescription}
            start={startDraft}
            onStart={setStartDraft}
            duration={durationMinutes}
            onDuration={setDurationMinutes}
            titlePlaceholder="Meeting with…"
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-10 rounded-full px-5 text-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createMutation.isPending} className="h-10 rounded-full px-6 text-sm">
              {createMutation.isPending ? "Saving…" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditEventDialog({ event, onOpenChange }: { event: CalendarEvent | null; onOpenChange: (open: boolean) => void }) {
  const updateMutation = useUpdateCalendarEventMutation();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDraft, setStartDraft] = React.useState(() => new Date());
  const [durationMinutes, setDurationMinutes] = React.useState(60);

  // Reseed the form whenever a different event opens, adjusting state during render rather than in an effect.
  const [seededId, setSeededId] = React.useState<string | null>(null);
  if (event && seededId !== event.id) {
    setSeededId(event.id);
    setTitle(event.title);
    setDescription(event.description ?? "");
    setStartDraft(new Date(event.startAt));
    setDurationMinutes(Math.max(15, Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 60000)));
  }
  if (!event && seededId !== null) setSeededId(null);

  const target = event ? editTargetFor(event) : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!target || !title.trim() || updateMutation.isPending) return;
    try {
      await updateMutation.mutateAsync({
        target,
        input: { title: title.trim(), description: description.trim() || null, startAt: startDraft.toISOString(), durationMinutes },
      });
      toast.add({ title: "Event updated", type: "success" });
      onOpenChange(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't update the event.", type: "error" });
    }
  }

  return (
    <Dialog open={event !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] gap-5 p-6 sm:max-w-lg">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-lg font-semibold tracking-tight">Edit event</DialogTitle>
          <DialogDescription className="text-sm">Changes also reach any calendar this event was added to.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex min-h-0 flex-col gap-5">
          <EventFields
            title={title}
            onTitle={setTitle}
            description={description}
            onDescription={setDescription}
            start={startDraft}
            onStart={setStartDraft}
            duration={durationMinutes}
            onDuration={setDurationMinutes}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-10 rounded-full px-5 text-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || updateMutation.isPending} className="h-10 rounded-full px-6 text-sm">
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
