"use client";

import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon as Plus,
  ArrowDown01Icon as ArrowDown,
  ArrowUp01Icon as ArrowUp,
  Delete02Icon as Trash,
  ImageUpload01Icon as ImageUpload,
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
import { uploadFile } from "@/lib/uploads";
import {
  createWhatsNew,
  deleteWhatsNew,
  listWhatsNew,
  reorderWhatsNew,
  updateWhatsNew,
  WHATS_NEW_KIND_LABEL,
  type WhatsNewItem,
  type WhatsNewKind,
} from "@/lib/whats-new";
import { WhatsNewCard } from "@/components/whats-new/whats-new-card";
import { WhatsNewDeck } from "@/components/whats-new/whats-new-popup";

const MAX_BULLETS = 6;

interface Draft {
  kind: WhatsNewKind;
  title: string;
  body: string;
  /** One point per line. */
  bullets: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  isActive: boolean;
}

const EMPTY_DRAFT: Draft = { kind: "new", title: "", body: "", bullets: "", imageUrl: "", ctaLabel: "", ctaUrl: "", isActive: true };

function draftFrom(item: WhatsNewItem): Draft {
  return {
    kind: item.kind,
    title: item.title,
    body: item.body ?? "",
    bullets: item.bullets.join("\n"),
    imageUrl: item.imageUrl ?? "",
    ctaLabel: item.ctaLabel ?? "",
    ctaUrl: item.ctaUrl ?? "",
    isActive: item.isActive,
  };
}

function bulletsOf(draft: Draft): string[] {
  return draft.bullets
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_BULLETS);
}

/** What stops this draft from being saved, or null when it's fine. */
function problemWith(draft: Draft): string | null {
  if (!draft.title.trim()) return "Add a title.";
  const label = draft.ctaLabel.trim();
  const url = draft.ctaUrl.trim();
  if (label && !url) return "The button needs a link.";
  if (url && !label) return "The button needs a label.";
  if (url && !url.startsWith("/") && !/^https?:\/\//i.test(url)) return "The button link must start with / or https://";
  if (draft.imageUrl.trim() && !/^https?:\/\//i.test(draft.imageUrl.trim())) return "The image address must start with https://";
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

export default function AdminWhatsNewPage() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading, isError } = useQuery({ queryKey: ["admin", "whats-new"], queryFn: listWhatsNew });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "whats-new"] });
    queryClient.invalidateQueries({ queryKey: ["whats-new", "active"] });
  };

  // null: the form is closed. "new": writing a new card. Otherwise the id being edited.
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<WhatsNewItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const problem = problemWith(draft);
  const activeItems = items.filter((item) => item.isActive);

  const openNew = () => {
    setDraft(EMPTY_DRAFT);
    setEditing("new");
  };
  const openEdit = (item: WhatsNewItem) => {
    setDraft(draftFrom(item));
    setEditing(item.id);
  };

  const save = async () => {
    if (problem || !editing) return;
    setSaving(true);
    const input = {
      kind: draft.kind,
      title: draft.title.trim(),
      body: draft.body.trim() || null,
      bullets: bulletsOf(draft),
      imageUrl: draft.imageUrl.trim() || null,
      ctaLabel: draft.ctaLabel.trim() || null,
      ctaUrl: draft.ctaUrl.trim() || null,
      isActive: draft.isActive,
    };
    try {
      if (editing === "new") await createWhatsNew(input);
      else await updateWhatsNew(editing, input);
      refresh();
      setEditing(null);
      toast.add({ title: editing === "new" ? "Card added to the top of the stack." : "Card saved.", type: "success" });
    } catch (err) {
      toast.add({ title: "Couldn't save the card.", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      set("imageUrl", uploaded.fileUrl);
    } catch (err) {
      toast.add({ title: "Couldn't upload the image.", description: err instanceof Error ? err.message : "Paste an image address instead.", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (item: WhatsNewItem) => {
    setBusyId(item.id);
    try {
      await updateWhatsNew(item.id, { isActive: !item.isActive });
      refresh();
    } catch {
      toast.add({ title: "Couldn't update the card.", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusyId(items[index].id);
    try {
      queryClient.setQueryData(["admin", "whats-new"], await reorderWhatsNew(ids));
      queryClient.invalidateQueries({ queryKey: ["whats-new", "active"] });
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
      await deleteWhatsNew(item.id);
      if (editing === item.id) setEditing(null);
      refresh();
      toast.add({ title: "Card deleted.", type: "success" });
    } catch {
      toast.add({ title: "Couldn't delete the card.", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-lg font-bold text-foreground">What&apos;s new</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Cards shown as a popup when someone opens the landing page: what you&apos;ve shipped and what&apos;s coming. Visitors see the active cards as
            a stack, in this order, once. Adding or changing a card shows the popup to everyone again.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={activeItems.length === 0} onClick={() => setPreviewOpen(true)}>
            <HugeiconsIcon icon={Eye} strokeWidth={2} className="h-4 w-4" />
            Preview popup
          </Button>
          <Button size="sm" onClick={openNew}>
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" />
            New card
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* The stack */}
        <section aria-label="Cards" className="space-y-2">
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {isError && <p className="text-xs text-destructive">Couldn&apos;t load the cards.</p>}
          {!isLoading && !isError && items.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm font-medium text-foreground">No cards yet</p>
              <p className="mt-1 text-xs text-muted-foreground">The popup doesn&apos;t show until there&apos;s at least one active card.</p>
              <Button size="sm" className="mt-4" onClick={openNew}>
                Write the first one
              </Button>
            </div>
          )}

          {items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors",
                editing === item.id ? "border-primary/60" : "border-border",
                !item.isActive && "opacity-60",
              )}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label={`Move "${item.title}" up`}
                  disabled={index === 0 || busyId !== null}
                  onClick={() => move(index, -1)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"
                >
                  <HugeiconsIcon icon={ArrowUp} strokeWidth={2.25} className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Move "${item.title}" down`}
                  disabled={index === items.length - 1 || busyId !== null}
                  onClick={() => move(index, 1)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"
                >
                  <HugeiconsIcon icon={ArrowDown} strokeWidth={2.25} className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-supplied image from any host
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {WHATS_NEW_KIND_LABEL[item.kind]}
                  {item.bullets.length > 0 && ` · ${item.bullets.length} point${item.bullets.length === 1 ? "" : "s"}`}
                  {item.ctaLabel && ` · button: ${item.ctaLabel}`}
                  {!item.isActive && " · hidden"}
                </p>
              </div>

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

        {/* The form, with the card as visitors will see it */}
        {editing && (
          <section aria-label={editing === "new" ? "New card" : "Edit card"} className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">{editing === "new" ? "New card" : "Edit card"}</h2>

            <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3">
              <Field label="Kind">
                <Select items={WHATS_NEW_KIND_LABEL} value={draft.kind} onValueChange={(v) => v && set("kind", v as WhatsNewKind)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="improved">Improved</SelectItem>
                    <SelectItem value="upcoming">Coming soon</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Title" hint={`${draft.title.length}/120`}>
                <Input value={draft.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder="Share links and photos from any app" />
              </Field>
            </div>

            <Field label="Text" hint="Optional">
              <Textarea value={draft.body} maxLength={600} rows={3} onChange={(e) => set("body", e.target.value)} placeholder="A sentence or two on what it does and why it matters." />
            </Field>

            <Field label="Points" hint={`One per line, up to ${MAX_BULLETS}`}>
              <Textarea value={draft.bullets} rows={3} onChange={(e) => set("bullets", e.target.value)} placeholder={"Works from YouTube, Chrome and your gallery\nOpens Quick Capture with it filled in"} />
            </Field>

            <Field label="Image" hint="Optional, 16:9 works best">
              <div className="flex gap-2">
                <Input value={draft.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" className="flex-1" />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="h-9 shrink-0">
                  <HugeiconsIcon icon={ImageUpload} strokeWidth={2} className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Button label" hint="Optional">
                <Input value={draft.ctaLabel} maxLength={60} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Try it" />
              </Field>
              <Field label="Button link">
                <Input value={draft.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/app/capture or https://…" />
              </Field>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <span>
                <span className="block text-xs font-semibold text-foreground">Show to visitors</span>
                <span className="block text-[11px] text-muted-foreground">Turn off to keep it as a draft.</span>
              </span>
              <Switch checked={draft.isActive} onCheckedChange={(on) => set("isActive", on)} />
            </label>

            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">Preview</p>
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                <WhatsNewCard item={{ ...draft, body: draft.body.trim() || null, bullets: bulletsOf(draft), imageUrl: draft.imageUrl.trim() || null, ctaLabel: draft.ctaLabel.trim() || null, ctaUrl: draft.ctaUrl.trim() || null }} />
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
                  {saving ? "Saving…" : editing === "new" ? "Add card" : "Save changes"}
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>

      <WhatsNewDeck items={activeItems} open={previewOpen} onOpenChange={setPreviewOpen} />

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{toDelete?.title}&rdquo; will be removed from the popup. This can&apos;t be undone. To keep it for later, hide it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Delete card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
