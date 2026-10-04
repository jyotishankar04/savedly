"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useCollectionsQuery, useUpdateMemoryMutation } from "@/context/MemoryContext";

interface MoveToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memoryId: string;
  memoryTitle: string;
  currentCollectionIds: string[];
}

/** Multi-select collection picker for a single memory — the only surface in
 * the app that lets you choose which collections a memory belongs to, rather
 * than just navigating away to the collections list. */
export function MoveToCollectionDialog({ open, onOpenChange, memoryId, memoryTitle, currentCollectionIds }: MoveToCollectionDialogProps) {
  const { data: collections = [], isLoading } = useCollectionsQuery();
  const updateMutation = useUpdateMemoryMutation();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Reseed the selection the moment the dialog transitions to open — adjusting
  // state during render (rather than in an effect) avoids an extra render pass.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelected(new Set(currentCollectionIds));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    try {
      await updateMutation.mutateAsync({ id: memoryId, patch: { collectionIds: Array.from(selected) } });
      toast.add({ title: "Collections updated", description: memoryTitle, type: "success" });
      onOpenChange(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't update collections.", type: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/20 p-4 pb-3">
          <DialogTitle className="text-xs font-bold">Move to collection</DialogTitle>
          <DialogDescription className="truncate text-[11px]">{memoryTitle}</DialogDescription>
        </DialogHeader>

        <Command>
          <CommandInput placeholder="Search collections..." />
          <CommandList>
            {isLoading ? (
              <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">Loading…</div>
            ) : (
              <>
                <CommandEmpty>No collections found.</CommandEmpty>
                <CommandGroup>
                  {collections.map((collection) => (
                    <CommandItem
                      key={collection.id}
                      value={collection.name}
                      data-checked={selected.has(collection.id)}
                      onSelect={() => toggle(collection.id)}
                    >
                      <span className="shrink-0">{collection.icon}</span>
                      <span className="truncate">{collection.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>

        <DialogFooter className="border-t border-border/20 p-4 pt-3">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="rounded-full" disabled={updateMutation.isPending} onClick={() => void save()}>
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
