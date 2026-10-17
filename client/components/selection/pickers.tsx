"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon as Plus, Search01Icon as Search, Tick02Icon as Tick } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { GlidingHighlight } from "@/components/ui/gliding-highlight";
import { Button } from "@/components/arc/button/button";
import { TagInput } from "@/components/arc/tag-input/tag-input";
import { useCollectionsQuery, useCreateCollectionMutation, useTagsQuery } from "@/context/MemoryContext";
import { formatRemindAt, remindChoices, shortWhen, toLocalInput } from "@/lib/remind";
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

type Pending<T> = {
  resolve: (value: T) => void;
  reject: (err: Cancelled) => void;
} | null;

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
  const [text, setText] = useState<{
    title: string;
    confirm: string;
    excludeId?: string;
  }>({ title: "", confirm: "" });

  const pick = (title: string, confirm: string, excludeId?: string) => {
    setText({ title, confirm, excludeId });
    return state.ask();
  };

  const element = (
    <Dialog open={state.open} onOpenChange={(open) => !open && state.dismiss()}>
      {state.open && (
        <CollectionPickerBody title={text.title} confirm={text.confirm} excludeId={text.excludeId} onPick={state.answer} onCancel={state.dismiss} />
      )}
    </Dialog>
  );
  return { pick, element };
}

const emoji = (icon: string) => (/^\p{Extended_Pictographic}/u.test(icon) ? icon : "📁");
const memories = (count: number) => `${count} ${count === 1 ? "memory" : "memories"}`;

/** A row in a picker's list: the gliding highlight follows the pointer, and the chosen row keeps a tinted fill. */
function PickerRow({
  chosen,
  onClick,
  onDoubleClick,
  role = "option",
  children,
  className,
}: {
  chosen: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  role?: "option" | "radio";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      data-nav-row
      aria-current={chosen || undefined}
      {...(role === "radio" ? { "aria-checked": chosen } : { "aria-selected": chosen })}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "relative z-[1] flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
        chosen && "bg-primary/10 text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** The list a picker scrolls: edges fade instead of cutting rows in half, and the scrollbar stays thin. */
const listClass =
  "-mx-2 max-h-[min(20rem,45dvh)] space-y-0.5 overflow-y-auto px-2 py-1 [scrollbar-width:thin] [mask-image:linear-gradient(to_bottom,transparent,black_0.5rem,black_calc(100%-0.75rem),transparent)]";

function CollectionPickerBody({
  title,
  confirm,
  excludeId,
  onPick,
  onCancel,
}: {
  title: string;
  confirm: string;
  excludeId?: string;
  onPick: (c: Collection) => void;
  onCancel: () => void;
}) {
  const { data: collections = [], isLoading } = useCollectionsQuery(true);
  const create = useCreateCollectionMutation();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => input.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, []);

  const shown = useMemo(
    () =>
      collections
        .filter((c) => c.id !== excludeId && !c.isVaulted && c.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [collections, query, excludeId],
  );
  const name = query.trim();
  const exact = collections.some((c) => c.name.toLowerCase() === name.toLowerCase());
  const chosenCollection = shown.find((c) => c.id === chosen);

  // Keep the chosen row in view while the arrow keys move it.
  useEffect(() => {
    if (chosen) document.getElementById(listId)?.querySelector(`[data-id="${chosen}"]`)?.scrollIntoView({ block: "nearest" });
  }, [chosen, listId]);

  const createNew = () => create.mutate({ name, icon: "📁" }, { onSuccess: (created) => onPick(created) });

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (shown.length === 0) return;
      const at = shown.findIndex((c) => c.id === chosen);
      const next = event.key === "ArrowDown" ? (at + 1) % shown.length : at <= 0 ? shown.length - 1 : at - 1;
      setChosen(shown[next]!.id);
    } else if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      if (chosenCollection) onPick(chosenCollection);
      else if (shown.length === 1) onPick(shown[0]!);
      else if (name && !exact) createNew();
    }
  };

  return (
    <DialogContent className="gap-4 sm:max-w-md" onKeyDown={onKeyDown}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Choose a collection, or type a new name to create one.</DialogDescription>
      </DialogHeader>
      <label className="flex h-11 items-center gap-2.5 rounded-xl bg-foreground/[0.06] px-3.5 transition-shadow focus-within:ring-2 focus-within:ring-primary/30">
        <HugeiconsIcon icon={Search} strokeWidth={2} className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={input}
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setChosen(null);
          }}
          placeholder="Find or create a collection"
          aria-label="Find or create a collection"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>
      <GlidingHighlight as="div" role="listbox" aria-label="Collections" id={listId} className={listClass} highlightClassName="rounded-xl">
        {name && !exact && (
          <PickerRow chosen={false} onClick={createNew} className="text-primary">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {create.isPending ? <Spinner className="h-4 w-4" /> : <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">Create “{name}”</span>
          </PickerRow>
        )}
        {isLoading && <Spinner className="mx-auto my-6" />}
        {shown.map((c) => (
          <PickerRow key={c.id} chosen={chosen === c.id} onClick={() => setChosen(c.id)} onDoubleClick={() => onPick(c)}>
            <span data-id={c.id} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.06] text-base leading-none">
              {emoji(c.icon)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{c.name}</span>
              <span className="block text-xs text-muted-foreground">{memories(c.memoryCount)}</span>
            </span>
            <HugeiconsIcon
              icon={Tick}
              strokeWidth={2.5}
              className={cn("h-4 w-4 shrink-0 text-primary transition-opacity", chosen === c.id ? "opacity-100" : "opacity-0")}
            />
          </PickerRow>
        ))}
        {!isLoading && collections.length === 0 && !name && (
          <p className="py-8 text-center text-sm text-muted-foreground">No collections yet. Type a name to create one.</p>
        )}
        {!isLoading && collections.length > 0 && shown.length === 0 && !name && (
          <p className="py-8 text-center text-sm text-muted-foreground">No other collections. Type a name to create one.</p>
        )}
      </GlidingHighlight>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!chosenCollection} onClick={() => chosenCollection && onPick(chosenCollection)}>
          {chosenCollection ? `${confirm} · ${chosenCollection.name}` : confirm}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/** Pick tag names to add (suggesting every tag you have) or remove (suggesting the selection's tags). */
export function useTagPicker() {
  const state = usePending<string[]>();
  const [text, setText] = useState<{
    title: string;
    confirm: string;
    suggestions?: string[];
  }>({ title: "", confirm: "" });
  const pick = (title: string, confirm: string, suggestions?: string[]) => {
    setText({ title, confirm, suggestions });
    return state.ask();
  };
  const element = (
    <Dialog open={state.open} onOpenChange={(open) => !open && state.dismiss()}>
      {state.open && <TagPickerBody {...text} onPick={state.answer} onCancel={state.dismiss} />}
    </Dialog>
  );
  return { pick, element };
}

function TagPickerBody({
  title,
  confirm,
  suggestions,
  onPick,
  onCancel,
}: {
  title: string;
  confirm: string;
  suggestions?: string[];
  onPick: (names: string[]) => void;
  onCancel: () => void;
}) {
  const { data: allTags = [] } = useTagsQuery();
  const [names, setNames] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const known = suggestions ?? allTags.map((t: { name: string }) => t.name);
  const typed = draft.trim().toLowerCase();
  const isNew = typed !== "" && !known.some((n) => n.toLowerCase() === typed);
  // Typing narrows the list: names that start with it first, then ones that contain it.
  const options = known
    .filter((n) => !names.some((x) => x.toLowerCase() === n.toLowerCase()) && n.toLowerCase().includes(typed))
    .sort((a, b) => Number(b.toLowerCase().startsWith(typed)) - Number(a.toLowerCase().startsWith(typed)))
    .slice(0, typed ? 12 : 18);

  // A typed name that matches one you have, in any case, becomes that tag rather than a near-duplicate.
  const toKnown = (list: string[]) => list.map((n) => known.find((k) => k.toLowerCase() === n.toLowerCase()) ?? n);
  const addKnown = (n: string) => {
    setNames((prev) => [...prev, n]);
    setDraft("");
  };

  return (
    <DialogContent className="gap-4 sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{suggestions ? "Pick the tags to remove." : "Search your tags, or type a new one and press Enter."}</DialogDescription>
      </DialogHeader>
      <TagInput
        label="Tags"
        value={names}
        onValueChange={(next) => setNames(toKnown(next))}
        draft={draft}
        onDraftChange={setDraft}
        placeholder={suggestions ? "Find a tag" : "Search or add a tag"}
      />
      <div className="min-h-[4.5rem] space-y-2">
        {options.length > 0 ? (
          <>
            <p className="text-xs font-medium text-muted-foreground">{typed ? "Matching tags" : suggestions ? "On the selected memories" : "Your tags"}</p>
            <div className="flex flex-wrap gap-1.5">
              {options.map((n) => (
                <button
                  key={n}
                  type="button"
                  // Keeps focus in the field, whose blur would otherwise turn the half-typed text into a tag.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addKnown(n)}
                  className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                >
                  <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-3 w-3" />
                  {n}
                </button>
              ))}
            </div>
          </>
        ) : isNew && !suggestions ? (
          <p className="pt-1 text-sm text-muted-foreground">
            No tag called “{draft.trim()}” yet. Press <kbd className="rounded border border-border px-1 font-sans text-xs">Enter</kbd> to add it as a new one.
          </p>
        ) : typed ? (
          <p className="pt-1 text-sm text-muted-foreground">{suggestions ? "None of the selected memories have that tag." : "No more tags match."}</p>
        ) : null}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={names.length === 0} onClick={() => onPick(names)}>
          {names.length > 1 ? `${confirm} · ${names.length}` : confirm}
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
      {state.open && <MergeBody options={options} onPick={state.answer} onCancel={state.dismiss} />}
    </Dialog>
  );
  return { pick, element };
}

function MergeBody({ options, onPick, onCancel }: { options: Collection[]; onPick: (c: Collection) => void; onCancel: () => void }) {
  const [chosen, setChosen] = useState(options[0]?.id ?? null);
  const total = options.reduce((sum, c) => sum + c.memoryCount, 0);
  const kept = options.find((x) => x.id === chosen);
  return (
    <DialogContent className="gap-4 sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Merge {options.length} collections</DialogTitle>
        <DialogDescription>
          Everything moves into the one you keep (up to {total} memories, without duplicates), and the others are deleted. No memories are removed.
        </DialogDescription>
      </DialogHeader>
      <GlidingHighlight as="div" role="radiogroup" aria-label="Collection to keep" className={listClass} highlightClassName="rounded-xl">
        {options.map((c) => (
          <PickerRow key={c.id} role="radio" chosen={chosen === c.id} onClick={() => setChosen(c.id)}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.06] text-base leading-none">{emoji(c.icon)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">Keep “{c.name}”</span>
              <span className="block text-xs text-muted-foreground">{memories(c.memoryCount)}</span>
            </span>
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                chosen === c.id ? "border-primary" : "border-foreground/25",
              )}
            >
              {chosen === c.id && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
          </PickerRow>
        ))}
      </GlidingHighlight>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!kept} onClick={() => kept && onPick(kept)}>
          {kept ? `Merge into ${kept.name}` : "Merge"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/**
 * "Remind me": when it should come back. Resolves to an ISO time, or null
 * for "cancel the reminder" (offered when one is set).
 */
export function useRemindPicker() {
  const state = usePending<string | null>();
  const [text, setText] = useState<{ title: string; current: string | null }>({ title: "", current: null });
  const pick = (title: string, current: string | null = null) => {
    setText({ title, current });
    return state.ask();
  };
  const element = (
    <Dialog open={state.open} onOpenChange={(open) => !open && state.dismiss()}>
      {state.open && <RemindBody title={text.title} current={text.current} onPick={state.answer} onCancel={state.dismiss} />}
    </Dialog>
  );
  return { pick, element };
}

function RemindBody({ title, current, onPick, onCancel }: { title: string; current: string | null; onPick: (at: string | null) => void; onCancel: () => void }) {
  const choices = useMemo(() => remindChoices(), []);
  const [custom, setCustom] = useState(false);
  const [value, setValue] = useState(() => toLocalInput(choices.find((c) => c.id === "tomorrow")?.at ?? new Date()));
  const [now] = useState(() => Date.now());
  const customAt = value ? new Date(value) : null;
  const customOk = !!customAt && !Number.isNaN(customAt.getTime()) && customAt.getTime() > now;
  const future = current && new Date(current).getTime() > now ? current : null;

  return (
    <DialogContent className="gap-4 sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {future ? `Set for ${formatRemindAt(future)}. ` : ""}It leaves your Inbox and comes back then, with a notification.
        </DialogDescription>
      </DialogHeader>
      <GlidingHighlight as="div" role="listbox" aria-label="When" className="-mx-2 space-y-0.5 px-2" highlightClassName="rounded-xl">
        {choices.map((choice) => (
          <PickerRow key={choice.id} chosen={false} onClick={() => onPick(choice.at.toISOString())}>
            <span className="min-w-0 flex-1 font-medium">{choice.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{shortWhen(choice.at)}</span>
          </PickerRow>
        ))}
        <PickerRow chosen={custom} onClick={() => setCustom((open) => !open)}>
          <span className="min-w-0 flex-1 font-medium">Pick a date and time</span>
        </PickerRow>
      </GlidingHighlight>
      {custom && (
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            aria-label="Date and time"
            value={value}
            min={toLocalInput(new Date())}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-xl bg-foreground/[0.06] px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 [color-scheme:light] dark:[color-scheme:dark]"
          />
          <Button size="sm" disabled={!customOk} onClick={() => customAt && onPick(customAt.toISOString())}>
            Set
          </Button>
        </div>
      )}
      <DialogFooter className="gap-2">
        {future && (
          <Button variant="ghost" onClick={() => onPick(null)}>
            Cancel reminder
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
