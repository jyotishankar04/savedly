"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreHorizontalIcon as More, PencilEdit02Icon as Pencil } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Button } from "@/components/arc/button/button";
import { cn } from "@/lib/utils";

export type CollectionFormValues = { name: string; icon: string; description: string };

/** One tap away, for the topics people collect most; the full picker is behind the last button. */
const QUICK_EMOJI = ["📁", "📚", "💡", "💻", "🎨", "🍳", "✈️", "🎵", "💼"];

const MAX_NAME = 100;

/**
 * The form behind New collection and Edit collection: an icon and a name side
 * by side (the way the collection will look in the sidebar), quick icon
 * picks, and an optional description. It reseeds from `initial` each time it
 * opens; `onSubmit` closes it by resolving, and keeps it open by throwing.
 */
export function CollectionFormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  initial,
  pending,
  disabled,
  notice,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  initial?: Partial<CollectionFormValues>;
  pending?: boolean;
  /** Blocks submitting, such as at the plan's collection limit; say why in `notice`. */
  disabled?: boolean;
  notice?: React.ReactNode;
  onSubmit: (values: CollectionFormValues) => Promise<void>;
}) {
  const seed = () => ({ name: initial?.name ?? "", icon: initial?.icon || "📁", description: initial?.description ?? "" });
  const [values, setValues] = React.useState<CollectionFormValues>(seed);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Reseed when the dialog opens: adjusting state during render, not in an effect, so the first frame is already right.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValues(seed());
  }

  const set = (patch: Partial<CollectionFormValues>) => setValues((prev) => ({ ...prev, ...patch }));
  // Old collections may still carry an icon name ("folder-outline") rather than an emoji.
  const shownIcon = /^\p{Extended_Pictographic}/u.test(values.icon) ? values.icon : "📁";
  const canSubmit = values.name.trim() !== "" && !pending && !disabled;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    await onSubmit({ name: values.name.trim(), icon: shownIcon, description: values.description.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      aria-label={`Icon: ${shownIcon}. Choose another`}
                      title="Choose an icon"
                      className="group/icon relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-foreground/[0.06] text-[1.75rem] leading-none transition-[background-color,transform] hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none active:scale-95"
                    >
                      {shownIcon}
                      <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-popover text-muted-foreground shadow-sm ring-1 ring-foreground/10 transition-colors group-hover/icon:text-foreground">
                        <HugeiconsIcon icon={Pencil} strokeWidth={2} className="h-3 w-3" />
                      </span>
                    </button>
                  }
                />
                <PopoverContent align="start" className="w-72 p-0">
                  <EmojiPicker
                    onEmojiSelect={(emoji) => {
                      set({ icon: emoji });
                      setPickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <input
                autoFocus
                required
                aria-label="Collection name"
                placeholder="Name it, e.g. Recipes"
                maxLength={MAX_NAME}
                value={values.name}
                onChange={(e) => set({ name: e.target.value })}
                className="h-14 min-w-0 flex-1 rounded-2xl bg-foreground/[0.06] px-4 text-base font-medium text-foreground outline-none transition-shadow placeholder:font-normal placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Quick icons">
              {QUICK_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Use ${emoji}`}
                  aria-pressed={shownIcon === emoji}
                  onClick={() => set({ icon: emoji })}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl text-lg leading-none transition-[background-color,transform] hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none active:scale-90",
                    shownIcon === emoji && "bg-primary/12 ring-1 ring-primary/40 hover:bg-primary/12",
                  )}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                aria-label="More icons"
                title="More icons"
                onClick={() => setPickerOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <HugeiconsIcon icon={More} strokeWidth={2} className="h-4 w-4" />
              </button>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="flex items-baseline justify-between text-sm font-medium">
              Description
              <span className="text-xs font-normal text-muted-foreground">Optional</span>
            </span>
            <textarea
              placeholder="What goes in here?"
              value={values.description}
              onChange={(e) => set({ description: e.target.value })}
              // Enter is a new line here; Ctrl/⌘+Enter saves, as in the name field.
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
              }}
              rows={3}
              className="block w-full resize-none rounded-2xl bg-foreground/[0.06] px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
            />
          </label>

          {notice}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} loading={pending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
