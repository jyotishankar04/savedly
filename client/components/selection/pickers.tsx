"use client";

import { useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon as Plus, Search01Icon as Search, Tick02Icon as Tick } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TagInput } from "@/components/arc/tag-input/tag-input";
import { useCollectionsQuery, useCreateCollectionMutation, useTagsQuery } from "@/context/MemoryContext";
import type { Collection } from "@/types/memory";
import { cn } from "@/lib/utils";

/**
 * The questions a bulk action asks before it runs (which collection, which
 * tags, which one keeps its name), as promises: `await pick(...)` resolves to
 * the answer, or throws Cancelled if the dialog is dismissed, which the
 * selection bar treats as "do nothing, keep the selection".
 */
export class Cancelled extends Error {
  constructor() {
    super("cancelled");
  }
}

type Pending<T> = { resolve: (value: T) => void; reject: (err: Cancelled) => void } | null;

function usePending<T>() {
  const pending = useRef<Pending<T>>(null);
  const [open, setOpen] = useState(false);
  const ask = () =>
    new Promise<T>((resolve, reject) => {
      pending.current = { resolve, reject };
      setOpen(true);
    });
  const answer = (value: T) => {
    pending.current?.resolve(value);
    pending.current = null;
    setOpen(false);
  };
  const dismiss = () => {
    pending.current?.reject(new Cancelled());
    pending.current = null;
    setOpen(false);
  };
  return { open, ask, answer, dismiss };
}

/** Pick a collection, or create one by name. */
export function useCollectionPicker() {
  const state = usePending<Collection>();
  const [text, setText] = useState<{ title: string; confirm: string; excludeId?: string }>({ title: "", confirm: "" });

  const pick = (title: string, confirm: string, excludeId?: string) => {
    setText({ title, confirm, excludeId });
    return state.ask();
  };

  const element = (
    <Dialog open={state.open} onOpenChange={(open) => !open && state.dismiss()}>
      {state.open && <CollectionPickerBody title={text.title} confirm={text.confirm} excludeId={text.excludeId} onPick={state.answer} />}
    </Dialog>
  );
  return { pick, element };
}

function CollectionPickerBody({ title, confirm, excludeId, onPick }: { title: string; confirm: string; excludeId?: string; onPick: (c: Collection) => void }) {
  const { data: collections = [], isLoading } = useCollectionsQuery(true);
  const create = useCreateCollectionMutation();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);

  const shown = useMemo(
    () =>
      collections
        .filter((c) => c.id !== excludeId && !c.isVaulted && c.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [collections, query, excludeId],
  );
  const name = query.trim();
  const exact = collections.some((c) => c.name.toLowerCase() === name.toLowerCase());

  return (
    <DialogContent className="gap-4 sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Choose a collection, or type a new name to create one.</DialogDescription>
      </DialogHeader>
      <label className="flex h-10 items-center gap-2 rounded-xl px-3 ring-1 ring-foreground/10 focus-within:ring-primary/50">
        <HugeiconsIcon icon={Search} strokeWidth={2} className="h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find or create a collection"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>
      <div className="max-h-72 space-y-0.5 overflow-y-auto">
        {isLoading && <Spinner className="mx-auto my-6" />}
        {shown.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChosen(c.id)}
            onDoubleClick={() => onPick(c)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--hover)]",
              chosen === c.id && "bg-primary/10 text-primary hover:bg-primary/10",
            )}
          >
            <span className="w-5 text-center text-base leading-none">{/^\p{Extended_Pictographic}/u.test(c.icon) ? c.icon : "📁"}</span>
            <span className="min-w-0 flex-1 truncate">{c.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{c.memoryCount}</span>
            {chosen === c.id && <HugeiconsIcon icon={Tick} strokeWidth={2.5} className="h-4 w-4" />}
          </button>
        ))}
        {!isLoading && shown.length === 0 && !name && <p className="py-6 text-center text-sm text-muted-foreground">No collections yet. Type a name to create one.</p>}
        {name && !exact && (
          <button
            type="button"
            disabled={create.isPending}
            onClick={() => create.mutate({ name, icon: "📁" }, { onSuccess: (created) => onPick(created) })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-[var(--hover)]"
          >
            {create.isPending ? <Spinner className="h-4 w-4" /> : <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" />}
            Create “{name}”
          </button>
        )}
      </div>
      <DialogFooter>
        <Button
          disabled={!chosen}
          onClick={() => {
            const c = collections.find((x) => x.id === chosen);
            if (c) onPick(c);
          }}
        >
          {confirm}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/** Pick tag names to add (suggesting every tag you have) or remove (suggesting the selection's tags). */
export function useTagPicker() {
  const state = usePending<string[]>();
  const [text, setText] = useState<{ title: string; confirm: string; suggestions?: string[] }>({ title: "", confirm: "" });
  const pick = (title: string, confirm: string, suggestions?: string[]) => {
    setText({ title, confirm, suggestions });
    return state.ask();
  };
  const element = (
    <Dialog open={state.open} onOpenChange={(open) => !open && state.dismiss()}>
      {state.open && <TagPickerBody {...text} onPick={state.answer} />}
    </Dialog>
  );
  return { pick, element };
}

function TagPickerBody({ title, confirm, suggestions, onPick }: { title: string; confirm: string; suggestions?: string[]; onPick: (names: string[]) => void }) {
  const { data: allTags = [] } = useTagsQuery();
  const [names, setNames] = useState<string[]>([]);
  const options = (suggestions ?? allTags.map((t: { name: string }) => t.name)).filter((n) => !names.includes(n)).slice(0, 18);
  return (
    <DialogContent className="gap-4 sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Type a tag and press Enter, or pick from the list.</DialogDescription>
      </DialogHeader>
      <TagInput label="Tags" value={names} onValueChange={setNames} placeholder="Add a tag" />
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNames((prev) => [...prev, n])}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:bg-[var(--hover)] hover:text-foreground"
            >
              {n}
            </button>
          ))}
        </div>
      )}
      <DialogFooter>
        <Button disabled={names.length === 0} onClick={() => onPick(names)}>
          {confirm}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/** Pick which of the selected collections keeps its name when they're merged. */
export function useMergeTargetPicker() {
  const state = usePending<Collection>();
  const [options, setOptions] = useState<Collection[]>([]);
  const pick = (selected: Collection[]) => {
    setOptions(selected);
    return state.ask();
  };
  const element = (
    <Dialog open={state.open} onOpenChange={(open) => !open && state.dismiss()}>
      {state.open && <MergeBody options={options} onPick={state.answer} />}
    </Dialog>
  );
  return { pick, element };
}

function MergeBody({ options, onPick }: { options: Collection[]; onPick: (c: Collection) => void }) {
  const [chosen, setChosen] = useState(options[0]?.id ?? null);
  const total = options.reduce((sum, c) => sum + c.memoryCount, 0);
  return (
    <DialogContent className="gap-4 sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Merge {options.length} collections</DialogTitle>
        <DialogDescription>
          Everything moves into the one you keep (up to {total} memories, without duplicates), and the others are deleted. No memories are removed.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-0.5" role="radiogroup" aria-label="Collection to keep">
        {options.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={chosen === c.id}
            onClick={() => setChosen(c.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--hover)]",
              chosen === c.id && "bg-primary/10 text-primary hover:bg-primary/10",
            )}
          >
            <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", chosen === c.id ? "border-primary" : "border-foreground/30")}>
              {chosen === c.id && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span className="min-w-0 flex-1 truncate">Keep “{c.name}”</span>
            <span className="text-xs text-muted-foreground tabular-nums">{c.memoryCount}</span>
          </button>
        ))}
      </div>
      <DialogFooter>
        <Button
          disabled={!chosen}
          onClick={() => {
            const c = options.find((x) => x.id === chosen);
            if (c) onPick(c);
          }}
        >
          Merge
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
