"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { toast } from "@/components/ui/toast";
import { useUpdateCollectionMutation } from "@/context/MemoryContext";
import type { Collection } from "@/types/memory";

interface EditCollectionDialogProps {
  collection: Pick<Collection, "id" | "name" | "icon" | "description">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCollectionDialog({ collection, open, onOpenChange }: EditCollectionDialogProps) {
  const updateMutation = useUpdateCollectionMutation();
  const [name, setName] = React.useState(collection.name);
  const [description, setDescription] = React.useState(collection.description ?? "");
  const [emoji, setEmoji] = React.useState(collection.icon);
  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);

  // Reseed the draft from the current collection the moment the dialog
  // opens — adjusting state during render (not an effect) avoids an extra
  // render pass and can't loop, since `wasOpen` flips to match on the very
  // next check.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(collection.name);
      setDescription(collection.description ?? "");
      setEmoji(collection.icon);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || updateMutation.isPending) return;
    try {
      await updateMutation.mutateAsync({
        id: collection.id,
        patch: { name: name.trim(), icon: emoji.trim() || "📁", description: description.trim() },
      });
      toast.add({ title: "Collection updated", type: "success" });
      onOpenChange(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't update this collection.", type: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-6 p-6">
        <DialogHeader className="border-b border-border/20 pb-2">
          <DialogTitle className="text-xs font-bold text-foreground">Edit collection</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Icon / Emoji</label>
              <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex h-[42px] w-full items-center justify-center rounded-xl border border-input bg-background text-xl transition-colors hover:bg-muted"
                    >
                      {emoji}
                    </button>
                  }
                />
                <PopoverContent align="start" className="w-72 p-0">
                  <EmojiPicker
                    onEmojiSelect={(next) => {
                      setEmoji(next);
                      setEmojiPickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Collection name</label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-[42px] w-full rounded-xl border-input bg-background px-3 text-xs text-foreground"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground">Description</label>
            <Textarea
              placeholder="What is this collection for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border-input bg-background px-3 py-2.5 text-xs text-foreground"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-10 flex-1 rounded-full">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !name.trim()} className="h-10 flex-1 rounded-full bg-primary text-white">
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
