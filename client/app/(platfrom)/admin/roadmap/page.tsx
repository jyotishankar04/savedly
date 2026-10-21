"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon as Plus,
  ArrowDown01Icon as ArrowDown,
  ArrowUp01Icon as ArrowUp,
  Delete02Icon as Trash,
  PencilEdit02Icon as Pencil,
  ViewIcon as Eye,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  createRoadmapItem,
  deleteRoadmapItem,
  listRoadmapItems,
  reorderRoadmap,
  ROADMAP_STATUS_LABEL,
  updateRoadmapItem,
  type AdminRoadmapItem,
  type RoadmapStatus,
} from "@/lib/roadmap";

// Admin > Roadmap: the "Working on now" and "Coming next" items on the public
// /roadmap page (server: modules/roadmap). No dates anywhere, only an order
// within each column. Shipped work isn't managed here: it's the changelog.

const MAX_POINTS = 6;
const QUERY_KEY = ["admin", "roadmap"] as const;

interface Draft {
  status: RoadmapStatus;
  title: string;
  description: string;
  area: string;
  /** One per line. */
  points: string;
  isActive: boolean;
}

const EMPTY_DRAFT: Draft = { status: "next", title: "", description: "", area: "", points: "", isActive: true };

const draftFrom = (item: AdminRoadmapItem): Draft => ({
  status: item.status,
  title: item.title,
  description: item.description,
  area: item.area ?? "",
  points: item.points.join("\n"),
  isActive: item.isActive,
});

const pointsOf = (draft: Draft) =>
  draft.points
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

function problemWith(draft: Draft): string | null {
  if (!draft.title.trim()) return "Give it a title.";
  if (!draft.description.trim()) return "Say what it is in a sentence or two.";
  if (pointsOf(draft).length > MAX_POINTS) return `Up to ${MAX_POINTS} points.`;
  if (pointsOf(draft).some((point) => point.length > 120)) return "Keep each point under 120 characters.";
  return null;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export default function AdminRoadmapPage() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading, isError } = useQuery({ queryKey: QUERY_KEY, queryFn: listRoadmapItems });
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  // null: the form is closed. "new": a new item. Otherwise the id being edited.
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminRoadmapItem | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const problem = problemWith(draft);
  const columns: { status: RoadmapStatus; items: AdminRoadmapItem[] }[] = [
    { status: "now", items: items.filter((item) => item.status === "now") },
    { status: "next", items: items.filter((item) => item.status === "next") },
  ];
  const editedItem = items.find((item) => item.id === editing);

  const openNew = (status: RoadmapStatus = "next") => {
    setDraft({ ...EMPTY_DRAFT, status });
    setEditing("new");
  };
  const openEdit = (item: AdminRoadmapItem) => {
    setDraft(draftFrom(item));
    setEditing(item.id);
  };

  const save = async () => {
    if (problem || !editing) return;
    setSaving(true);
    const input = {
      status: draft.status,
      title: draft.title.trim(),
      description: draft.description.trim(),
      area: draft.area.trim() || null,
      points: pointsOf(draft),
      isActive: draft.isActive,
    };
    try {
      if (editing === "new") await createRoadmapItem(input);
      else await updateRoadmapItem(editing, input);
      refresh();
      setEditing(null);
      toast.add({ title: editing === "new" ? `Added to ${ROADMAP_STATUS_LABEL[input.status]}.` : "Saved.", description: "The roadmap page shows it within a minute.", type: "success" });
    } catch (err) {
      toast.add({ title: "Couldn't save it.", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: AdminRoadmapItem) => {
    setBusyId(item.id);
    try {
      await updateRoadmapItem(item.id, { isActive: !item.isActive });
      refresh();
    } catch {
      toast.add({ title: "Couldn't update it.", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  /** Starting work on a planned item, or putting one back. */
  const moveTo = async (item: AdminRoadmapItem, status: RoadmapStatus) => {
    setBusyId(item.id);
    try {
      await updateRoadmapItem(item.id, { status });
      refresh();
      toast.add({ title: `Moved to ${ROADMAP_STATUS_LABEL[status]}.`, type: "success" });
    } catch {
      toast.add({ title: "Couldn't move it.", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const move = async (column: AdminRoadmapItem[], index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= column.length) return;
    const ids = column.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusyId(column[index].id);
    try {
      queryClient.setQueryData(QUERY_KEY, await reorderRoadmap(column[index].status, ids));
    } catch {
      toast.add({ title: "Couldn't change the order.", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const item = toDelete;
    setToDelete(null);
    setBusyId(item.id);
    try {
      await deleteRoadmapItem(item.id);
      if (editing === item.id) setEditing(null);
      refresh();
      toast.add({ title: "Deleted.", type: "success" });
    } catch {
      toast.add({ title: "Couldn't delete it.", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-lg font-bold text-foreground">Roadmap</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            The public roadmap at /roadmap: what&apos;s being built now and what&apos;s planned next, in this order. No dates, only an order. Visitors can vote on
            planned items. What has shipped comes from the changelog, so when something ships, add a changelog entry and delete or hide it here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" render={<a href="/roadmap" target="_blank" rel="noopener noreferrer" />}>
            <HugeiconsIcon icon={Eye} strokeWidth={2} className="h-4 w-4" />
            View the page
          </Button>
          <Button size="sm" onClick={() => openNew("next")}>
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" />
            New item
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-6">
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {isError && <p className="text-xs text-destructive">Couldn&apos;t load the roadmap.</p>}

          {!isLoading &&
            !isError &&
            columns.map(({ status, items: column }) => (
              <section key={status} aria-label={ROADMAP_STATUS_LABEL[status]} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    {ROADMAP_STATUS_LABEL[status]}
                    <span className="ml-2 font-normal tabular-nums text-muted-foreground">{column.length}</span>
                  </h2>
                  <button type="button" onClick={() => openNew(status)} className="text-xs font-medium text-primary hover:underline">
                    Add here
                  </button>
                </div>

                {column.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    {status === "now" ? "Nothing in progress. Move a planned item here when work starts." : "Nothing planned yet."}
                  </div>
                )}

                {column.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors", editing === item.id ? "border-primary/60" : "border-border", !item.isActive && "opacity-60")}
                  >
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label={`Move "${item.title}" up`}
                        disabled={index === 0 || busyId !== null}
                        onClick={() => move(column, index, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"
                      >
                        <HugeiconsIcon icon={ArrowUp} strokeWidth={2.25} className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move "${item.title}" down`}
                        disabled={index === column.length - 1 || busyId !== null}
                        onClick={() => move(column, index, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"
                      >
                        <HugeiconsIcon icon={ArrowDown} strokeWidth={2.25} className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {[item.area, item.points.length > 0 && `${item.points.length} point${item.points.length === 1 ? "" : "s"}`, !item.isActive && "hidden"].filter(Boolean).join(" · ") || item.description}
                      </p>
                    </div>

                    {status === "next" && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-foreground" title="Votes from signed-in people">
                        {item.votes} {item.votes === 1 ? "vote" : "votes"}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => moveTo(item, status === "next" ? "now" : "next")}
                      className="hidden shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 sm:block"
                    >
                      {status === "next" ? "Start work" : "Back to planned"}
                    </button>
                    <Switch
                      checked={item.isActive}
                      disabled={busyId === item.id}
                      onCheckedChange={() => toggleActive(item)}
                      aria-label={item.isActive ? `Hide "${item.title}"` : `Show "${item.title}"`}
                    />
                    <button
                      type="button"
                      aria-label={`Edit "${item.title}"`}
                      onClick={() => openEdit(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <HugeiconsIcon icon={Pencil} strokeWidth={2} className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete "${item.title}"`}
                      disabled={busyId === item.id}
                      onClick={() => setToDelete(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Trash} strokeWidth={2} className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </section>
            ))}
        </div>

        {/* The form, with the item as visitors will see it */}
        {editing && (
          <section aria-label={editing === "new" ? "New item" : "Edit item"} className="space-y-4 self-start rounded-xl border border-border bg-card p-4 xl:sticky xl:top-6">
            <h2 className="text-sm font-semibold text-foreground">{editing === "new" ? "New item" : "Edit item"}</h2>

            <div className="grid grid-cols-[11rem_minmax(0,1fr)] gap-3">
              <Field label="Where">
                <Select items={ROADMAP_STATUS_LABEL} value={draft.status} onValueChange={(v) => v && set("status", v as RoadmapStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Working on now</SelectItem>
                    <SelectItem value="next">Coming next</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Area" hint="Optional">
                <Input value={draft.area} maxLength={40} onChange={(e) => set("area", e.target.value)} placeholder="Extension, Inbox, App…" />
              </Field>
            </div>

            <Field label="Title" hint={`${draft.title.length}/120`}>
              <Input value={draft.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder="Savedly for Firefox" />
            </Field>

            <Field label="What it is" hint={`${draft.description.length}/600`}>
              <Textarea value={draft.description} maxLength={600} rows={3} onChange={(e) => set("description", e.target.value)} placeholder="A sentence or two on what it is and why it matters. No dates." />
            </Field>

            <Field label="What you'll be able to do" hint={`One per line, up to ${MAX_POINTS}`}>
              <Textarea value={draft.points} rows={4} onChange={(e) => set("points", e.target.value)} placeholder={"Save pages, links and screenshots\nHighlights in the sidebar"} />
            </Field>

            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <span>
                <span className="block text-xs font-semibold text-foreground">Show on the roadmap</span>
                <span className="block text-[11px] text-muted-foreground">Turn off to keep it as a draft{editedItem && editedItem.votes > 0 ? "; its votes are kept" : ""}.</span>
              </span>
              <Switch checked={draft.isActive} onCheckedChange={(on) => set("isActive", on)} />
            </label>

            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">Preview</p>
              <div className="rounded-2xl border border-border/70 bg-background p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("rounded-full px-2 py-0.5 font-medium", draft.status === "now" ? "bg-primary/10 text-primary" : "bg-muted text-foreground")}>
                    {draft.status === "now" ? "In progress" : "Planned"}
                  </span>
                  {draft.area.trim() && <span className="rounded-full bg-muted px-2 py-0.5">{draft.area.trim()}</span>}
                </div>
                <p className="mt-3 text-base font-medium text-foreground">{draft.title.trim() || "Title"}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{draft.description.trim() || "What it is."}</p>
                {pointsOf(draft).length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
                    {pointsOf(draft).map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-destructive" role="status">
                {problem ?? ""}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={save} disabled={saving || !!problem}>
                  {saving ? "Saving…" : editing === "new" ? "Add item" : "Save changes"}
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{toDelete?.title}&rdquo; leaves the roadmap{toDelete && toDelete.votes > 0 ? `, with its ${toDelete.votes} vote${toDelete.votes === 1 ? "" : "s"}` : ""}. This can&apos;t be undone. To keep it for later,
              hide it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Delete item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
