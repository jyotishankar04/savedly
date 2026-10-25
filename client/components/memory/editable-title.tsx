"use client";

import { useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { useUpdateMemoryMutation } from "@/context/MemoryContext";
import { cn } from "@/lib/utils";

const MAX_TITLE = 500;

/**
 * A memory's title that renames in place (roadmap: "Rename in place, no
 * dialog"): tap or click it and it becomes a text box. Enter or tapping away
 * saves, Escape puts it back, and an empty title is never saved.
 */
export function EditableTitle({ id, title, className }: { id: string; title: string; className?: string }) {
  const update = useUpdateMemoryMutation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const field = useRef<HTMLTextAreaElement>(null);
  // Escape cancels, and the blur that follows mustn't save.
  const cancelled = useRef(false);

  const start = () => {
    setDraft(title);
    cancelled.current = false;
    setEditing(true);
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.select();
    });
  };
  const save = () => {
    setEditing(false);
    if (cancelled.current) return;
    const next = draft.replace(/\s+/g, " ").trim();
    if (!next || next === title) return;
    update.mutate(
      { id, patch: { title: next } },
      { onError: () => toast.add({ title: "Couldn't rename it. Try again.", type: "error" }) },
    );
  };

  if (editing) {
    return (
      <>
        <label htmlFor={`title-${id}`} className="sr-only">
          Title
        </label>
        <textarea
          ref={field}
          id={`title-${id}`}
          value={draft}
          maxLength={MAX_TITLE}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              field.current?.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelled.current = true;
              field.current?.blur();
            }
          }}
          className={cn(
            "-mx-2 -my-1 block w-[calc(100%+1rem)] resize-none rounded-lg bg-muted/60 px-2 py-1 outline-none ring-2 ring-primary/40 [field-sizing:content]",
            className,
          )}
        />
      </>
    );
  }

  // The new title shows at once while it saves.
  const shown = update.isPending && update.variables?.id === id && update.variables.patch.title ? update.variables.patch.title : title;
  return (
    <h1 className={className}>
      <button
        type="button"
        onClick={start}
        title="Rename"
        className="-mx-1 max-w-full rounded-md px-1 text-left [overflow-wrap:anywhere] transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {shown}
        <span className="sr-only"> (rename)</span>
      </button>
    </h1>
  );
}
