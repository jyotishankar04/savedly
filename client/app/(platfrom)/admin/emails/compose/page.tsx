"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowDown01Icon as ArrowDown,
  ArrowLeft01Icon as ArrowLeft,
  ArrowUp01Icon as ArrowUp,
  ComputerIcon as Desktop,
  Delete02Icon as Trash,
  Image01Icon as ImageIcon,
  InformationCircleIcon as NoteIcon,
  LeftToRightListBulletIcon as ListIcon,
  Link01Icon as ButtonIcon,
  MinusSignIcon as DividerIcon,
  SmartPhone01Icon as Phone,
  TextFontIcon as TextIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { RecipientPicker } from "@/components/admin/recipient-picker";
import type { AdminUser } from "@/lib/admin-users";
import {
  previewEmail,
  sendEmail,
  sendTestEmail,
  type EmailBlock,
  type EmailCampaignCategory,
  type EmailContent,
  type EmailTone,
} from "@/lib/admin-emails";

// --- The draft ---------------------------------------------------------------
//
// What's on screen while writing. Every block keeps every field, so switching
// nothing loses text; toContent() below turns it into what the server takes,
// leaving out anything still empty.

type BlockType = EmailBlock["type"];

interface DraftBlock {
  id: string;
  type: BlockType;
  text: string;
  /** Bullet points, one per line. */
  items: string;
  label: string;
  url: string;
  alt: string;
  tone: EmailTone;
}

interface Draft {
  subject: string;
  category: EmailCampaignCategory;
  label: string;
  tone: EmailTone;
  headline: string;
  blocks: DraftBlock[];
}

let nextBlockId = 0;
function newBlock(type: BlockType, fields: Partial<DraftBlock> = {}): DraftBlock {
  nextBlockId += 1;
  return { id: `b${nextBlockId}`, type, text: "", items: "", label: "", url: "", alt: "", tone: "neutral", ...fields };
}

const BLOCK_TYPES: { type: BlockType; name: string; hint: string; icon: IconSvgElement }[] = [
  { type: "text", name: "Text", hint: "A paragraph or two", icon: TextIcon },
  { type: "bullets", name: "Bullet list", hint: "Short points", icon: ListIcon },
  { type: "button", name: "Button", hint: "One link to follow", icon: ButtonIcon },
  { type: "note", name: "Note", hint: "A highlighted box", icon: NoteIcon },
  { type: "image", name: "Image", hint: "A picture by address", icon: ImageIcon },
  { type: "divider", name: "Divider", hint: "A thin line", icon: DividerIcon },
];

const TONES: { value: EmailTone; name: string; swatch: string }[] = [
  { value: "primary", name: "Blue", swatch: "bg-[#1746d6]" },
  { value: "success", name: "Green", swatch: "bg-[#0f7a4d]" },
  { value: "warning", name: "Amber", swatch: "bg-[#9a5b00]" },
  { value: "danger", name: "Red", swatch: "bg-[#b42318]" },
  { value: "neutral", name: "Grey", swatch: "bg-[#8a94a6]" },
];

// Ready-made starting points, so a common email is a matter of changing words.
const STARTERS: { name: string; draft: () => Omit<Draft, "category"> & { category: EmailCampaignCategory } }[] = [
  {
    name: "Blank",
    draft: () => ({ subject: "", category: "custom", label: "", tone: "primary", headline: "", blocks: [newBlock("text")] }),
  },
  {
    name: "New feature",
    draft: () => ({
      subject: "New in SaveForLatter",
      category: "announcement",
      label: "New",
      tone: "primary",
      headline: "",
      blocks: [
        newBlock("text", { text: "We've just shipped something we think you'll like." }),
        newBlock("bullets", { items: "What it does\nWhy it's useful\nWhere to find it" }),
        newBlock("button", { label: "Try it now", url: "/app" }),
      ],
    }),
  },
  {
    name: "Product update",
    draft: () => ({
      subject: "What's new this month",
      category: "announcement",
      label: "Product update",
      tone: "primary",
      headline: "",
      blocks: [
        newBlock("text", { text: "Here's what we've been working on." }),
        newBlock("bullets", { items: "First improvement\nSecond improvement\nThird improvement" }),
        newBlock("divider"),
        newBlock("text", { text: "As always, reply through the contact page if anything isn't working for you." }),
        newBlock("button", { label: "Open SaveForLatter", url: "/app" }),
      ],
    }),
  },
  {
    name: "Maintenance notice",
    draft: () => ({
      subject: "Scheduled maintenance",
      category: "alert",
      label: "Heads up",
      tone: "warning",
      headline: "SaveForLatter will be briefly unavailable",
      blocks: [
        newBlock("text", { text: "We're doing some planned maintenance to keep things running well." }),
        newBlock("note", { text: "When: add the date and time here\nHow long: about 30 minutes", tone: "warning" }),
        newBlock("text", { text: "Nothing you've saved is affected, and you don't need to do anything." }),
      ],
    }),
  },
];

/** What stops a block from being included, or null when it's complete. Empty blocks are skipped silently. */
function blockProblem(block: DraftBlock): string | null {
  if (block.type === "button") {
    const label = block.label.trim();
    const url = block.url.trim();
    if (!label && !url) return null;
    if (!label) return "The button needs a label.";
    if (!url) return "The button needs a link.";
    if (!url.startsWith("/") && !/^https?:\/\//i.test(url)) return "The button's link must start with / or https://";
  }
  if (block.type === "image") {
    const url = block.url.trim();
    if (url && !/^https?:\/\//i.test(url)) return "The image address must start with https://";
  }
  return null;
}

/** The draft as the server takes it: only blocks that have something in them and are complete. */
function toContent(draft: Draft): EmailContent {
  const blocks: EmailBlock[] = [];
  for (const block of draft.blocks) {
    if (blockProblem(block)) continue;
    if (block.type === "text" && block.text.trim()) blocks.push({ type: "text", text: block.text.trim() });
    if (block.type === "bullets") {
      const items = block.items.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 12);
      if (items.length > 0) blocks.push({ type: "bullets", items });
    }
    if (block.type === "button" && block.label.trim() && block.url.trim()) blocks.push({ type: "button", label: block.label.trim(), url: block.url.trim() });
    if (block.type === "note" && block.text.trim()) blocks.push({ type: "note", text: block.text.trim(), tone: block.tone });
    if (block.type === "image" && block.url.trim()) blocks.push({ type: "image", url: block.url.trim(), alt: block.alt.trim() || undefined });
    if (block.type === "divider") blocks.push({ type: "divider" });
  }
  return {
    label: draft.label.trim() || undefined,
    tone: draft.tone,
    headline: draft.headline.trim() || undefined,
    blocks,
  };
}

// --- Small pieces ------------------------------------------------------------

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

function TonePicker({ value, onChange, label }: { value: EmailTone; onChange: (tone: EmailTone) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1.5">
      {TONES.map((tone) => (
        <button
          key={tone.value}
          type="button"
          role="radio"
          aria-checked={value === tone.value}
          aria-label={tone.name}
          title={tone.name}
          onClick={() => onChange(tone.value)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
            value === tone.value ? "border-foreground" : "border-transparent hover:border-border",
          )}
        >
          <span className={cn("h-4 w-4 rounded-full", tone.swatch)} />
        </button>
      ))}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// --- The page ----------------------------------------------------------------

export default function ComposeEmailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Draft>(() => STARTERS[0].draft());
  const [starter, setStarter] = useState("Blank");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, AdminUser>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setBlock = (id: string, fields: Partial<DraftBlock>) =>
    setDraft((d) => ({ ...d, blocks: d.blocks.map((block) => (block.id === id ? { ...block, ...fields } : block)) }));
  const addBlock = (type: BlockType) => setDraft((d) => ({ ...d, blocks: [...d.blocks, newBlock(type)] }));
  const removeBlock = (id: string) => setDraft((d) => ({ ...d, blocks: d.blocks.filter((block) => block.id !== id) }));
  const moveBlock = (index: number, delta: number) =>
    setDraft((d) => {
      const target = index + delta;
      if (target < 0 || target >= d.blocks.length) return d;
      const blocks = [...d.blocks];
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      return { ...d, blocks };
    });

  const content = useMemo(() => toContent(draft), [draft]);
  const blockProblems = draft.blocks.map(blockProblem).filter((problem): problem is string => problem !== null);
  const hasContent = content.blocks.some((block) => block.type !== "divider");
  const recipientCount = sendToAll ? null : selectedUsers.size;

  const problem = !draft.subject.trim()
    ? "Add a subject."
    : !hasContent
      ? "Add some content."
      : (blockProblems[0] ?? (!sendToAll && selectedUsers.size === 0 ? "Choose at least one recipient." : null));

  // The preview is the server's own rendering of this email, so what's shown
  // is what's sent. Asked for a moment after typing stops.
  const previewKey = JSON.stringify({ subject: draft.subject, content });
  const latestRequest = useRef(0);
  useEffect(() => {
    if (!hasContent) return;
    const request = ++latestRequest.current;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const { html } = await previewEmail(JSON.parse(previewKey) as { subject: string; content: EmailContent });
        if (request !== latestRequest.current) return;
        setPreviewHtml(html);
        setPreviewError(null);
      } catch (err) {
        if (request !== latestRequest.current) return;
        setPreviewError(err instanceof Error ? err.message : "Couldn't build the preview.");
      } finally {
        if (request === latestRequest.current) setPreviewing(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [previewKey, hasContent]);

  const applyStarter = (name: string) => {
    const found = STARTERS.find((entry) => entry.name === name);
    if (!found) return;
    setStarter(name);
    setDraft(found.draft());
  };

  const sendTest = async () => {
    if (!hasContent || blockProblems.length > 0) return;
    setTesting(true);
    try {
      const { to } = await sendTestEmail({ subject: draft.subject.trim(), content });
      toast.add({ title: "Test sent", description: `Check ${to}. It arrives with [Test] in the subject.`, type: "success" });
    } catch (err) {
      toast.add({ title: "Couldn't send the test", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setTesting(false);
    }
  };

  const send = async () => {
    if (problem) return;
    setConfirmOpen(false);
    setSending(true);
    try {
      const result = await sendEmail({
        subject: draft.subject.trim(),
        content,
        category: draft.category,
        recipients: sendToAll ? { all: true } : { userIds: Array.from(selectedUsers.keys()) },
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "emails"] });
      toast.add({ title: "Email queued", description: `${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}`, type: "success" });
      router.push("/admin/emails");
    } catch (err) {
      toast.add({ title: "Couldn't send the email", description: err instanceof Error ? err.message : undefined, type: "error" });
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/emails" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
            <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3 w-3" />
            Emails
          </Link>
          <h1 className="mt-1 text-lg font-bold text-foreground">Compose email</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Build the email from blocks. The preview is exactly what recipients get, in the same design as every other SaveForLatter email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg" disabled={testing || !hasContent || blockProblems.length > 0} onClick={sendTest}>
            {testing ? "Sending…" : "Send me a test"}
          </Button>
          <Button size="lg" disabled={sending || !!problem} onClick={() => setConfirmOpen(true)}>
            {sending ? "Sending…" : sendToAll ? "Send to all users" : `Send to ${recipientCount} ${recipientCount === 1 ? "user" : "users"}`}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        {/* ---- Editor ---- */}
        <div className="space-y-4">
          <Section title="Start from" description="Pick a starting point, then change the words. Choosing one replaces what's below.">
            <div className="flex flex-wrap gap-1.5">
              {STARTERS.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  aria-pressed={starter === entry.name}
                  onClick={() => applyStarter(entry.name)}
                  className={cn(
                    "h-8 rounded-full border px-3.5 text-xs font-medium transition-colors",
                    starter === entry.name ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Subject and heading">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <Field label="Subject" hint={`${draft.subject.length}/255`}>
                <Input value={draft.subject} maxLength={255} onChange={(e) => set("subject", e.target.value)} placeholder="What the inbox shows" />
              </Field>
              <Field label="Category">
                <Select
                  items={{ marketing: "Marketing", alert: "Alert", announcement: "Announcement", custom: "Custom" }}
                  value={draft.category}
                  onValueChange={(v) => v && set("category", v as EmailCampaignCategory)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Headline" hint="Optional. Uses the subject if empty">
              <Input value={draft.headline} maxLength={140} onChange={(e) => set("headline", e.target.value)} placeholder={draft.subject || "The big line at the top of the email"} />
            </Field>
            <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Field label="Label" hint="Optional. The small tag above the headline">
                <Input value={draft.label} maxLength={40} onChange={(e) => set("label", e.target.value)} placeholder="From the SaveForLatter team" />
              </Field>
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-foreground">Label colour</span>
                <TonePicker value={draft.tone} onChange={(tone) => set("tone", tone)} label="Label colour" />
              </div>
            </div>
          </Section>

          <Section title="Content" description="Blocks appear in the email in this order.">
            {draft.blocks.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No blocks yet. Add one below.</p>}

            {draft.blocks.map((block, index) => {
              const meta = BLOCK_TYPES.find((entry) => entry.type === block.type)!;
              const issue = blockProblem(block);
              return (
                <div key={block.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <HugeiconsIcon icon={meta.icon} strokeWidth={2} className="h-3.5 w-3.5 text-muted-foreground" />
                      {meta.name}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon-sm" aria-label={`Move ${meta.name} up`} disabled={index === 0} onClick={() => moveBlock(index, -1)}>
                        <HugeiconsIcon icon={ArrowUp} strokeWidth={2.25} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Move ${meta.name} down`} disabled={index === draft.blocks.length - 1} onClick={() => moveBlock(index, 1)}>
                        <HugeiconsIcon icon={ArrowDown} strokeWidth={2.25} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${meta.name}`} onClick={() => removeBlock(block.id)} className="hover:bg-destructive/10 hover:text-destructive">
                        <HugeiconsIcon icon={Trash} strokeWidth={2} />
                      </Button>
                    </span>
                  </div>

                  {block.type === "text" && (
                    <Textarea aria-label="Text" value={block.text} rows={3} maxLength={4000} onChange={(e) => setBlock(block.id, { text: e.target.value })} placeholder="Write a paragraph. Leave a blank line to start a new one." />
                  )}
                  {block.type === "bullets" && (
                    <Textarea aria-label="Bullet points" value={block.items} rows={3} onChange={(e) => setBlock(block.id, { items: e.target.value })} placeholder={"One point per line\nUp to 12 points"} />
                  )}
                  {block.type === "button" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input aria-label="Button label" value={block.label} maxLength={60} onChange={(e) => setBlock(block.id, { label: e.target.value })} placeholder="Button label" />
                      <Input aria-label="Button link" value={block.url} onChange={(e) => setBlock(block.id, { url: e.target.value })} placeholder="/app/capture or https://…" />
                    </div>
                  )}
                  {block.type === "note" && (
                    <div className="space-y-2">
                      <Textarea aria-label="Note" value={block.text} rows={2} maxLength={1000} onChange={(e) => setBlock(block.id, { text: e.target.value })} placeholder="Something to set apart: a date, a warning, a tip." />
                      <TonePicker value={block.tone} onChange={(tone) => setBlock(block.id, { tone })} label="Note colour" />
                    </div>
                  )}
                  {block.type === "image" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input aria-label="Image address" value={block.url} onChange={(e) => setBlock(block.id, { url: e.target.value })} placeholder="https://… (an image address)" />
                      <Input aria-label="Image description" value={block.alt} maxLength={200} onChange={(e) => setBlock(block.id, { alt: e.target.value })} placeholder="Describe it, for people who can't see it" />
                    </div>
                  )}
                  {block.type === "divider" && <p className="text-[11px] text-muted-foreground">A thin line between sections.</p>}

                  {issue && <p className="mt-2 text-[11px] text-destructive">{issue}</p>}
                </div>
              );
            })}

            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Add a block</p>
              <div className="flex flex-wrap gap-1.5">
                {BLOCK_TYPES.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    title={entry.hint}
                    disabled={draft.blocks.length >= 20}
                    onClick={() => addBlock(entry.type)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-40"
                  >
                    <HugeiconsIcon icon={entry.icon} strokeWidth={2} className="h-3.5 w-3.5 text-muted-foreground" />
                    {entry.name}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Recipients">
            <div className="flex gap-2">
              {[
                { all: true, name: "All active users" },
                { all: false, name: "Select users" },
              ].map((option) => (
                <button
                  key={option.name}
                  type="button"
                  aria-pressed={sendToAll === option.all}
                  onClick={() => setSendToAll(option.all)}
                  className={cn(
                    "h-9 flex-1 rounded-full border text-xs font-semibold transition-colors",
                    sendToAll === option.all ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {option.name}
                </button>
              ))}
            </div>

            {!sendToAll && (
              <div className="space-y-2">
                <Button type="button" variant="outline" size="lg" onClick={() => setPickerOpen(true)}>
                  {selectedUsers.size > 0 ? `${selectedUsers.size} selected. Edit` : "Choose recipients…"}
                </Button>
                {selectedUsers.size > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(selectedUsers.values()).map((user) => (
                      <span key={user.id} className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px]">
                        {user.name ?? user.email}
                        <button
                          type="button"
                          aria-label={`Remove ${user.name ?? user.email}`}
                          onClick={() =>
                            setSelectedUsers((prev) => {
                              const next = new Map(prev);
                              next.delete(user.id);
                              return next;
                            })
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Section>

          <p className="text-[11px] text-destructive" role="status">
            {problem ?? ""}
          </p>
        </div>

        {/* ---- Preview ---- */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{draft.subject.trim() || "Your subject"}</p>
                <p className="text-[11px] text-muted-foreground">{previewing ? "Updating…" : "Preview"}</p>
              </div>
              <div role="radiogroup" aria-label="Preview size" className="flex shrink-0 rounded-full border border-border p-0.5">
                {[
                  { value: "desktop" as const, name: "Desktop", icon: Desktop },
                  { value: "phone" as const, name: "Phone", icon: Phone },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={device === option.value}
                    aria-label={option.name}
                    title={option.name}
                    onClick={() => setDevice(option.value)}
                    className={cn("flex h-7 w-8 items-center justify-center rounded-full transition-colors", device === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <HugeiconsIcon icon={option.icon} strokeWidth={2} className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center bg-muted/40 p-3">
              {!hasContent ? (
                <div className="flex h-[32rem] w-full items-center justify-center text-center">
                  <p className="max-w-[14rem] text-xs leading-relaxed text-muted-foreground">Add some content and the email appears here as you type.</p>
                </div>
              ) : previewError && !previewHtml ? (
                <div className="flex h-[32rem] w-full items-center justify-center text-center">
                  <p className="max-w-[16rem] text-xs leading-relaxed text-destructive">{previewError}</p>
                </div>
              ) : (
                <iframe
                  title="Email preview"
                  // Rendered by the server from the same template the mail uses.
                  // Sandboxed: an email has no scripts, and nothing in it should run.
                  sandbox=""
                  srcDoc={previewHtml ?? ""}
                  className={cn("h-[40rem] rounded-lg border border-border bg-white transition-[width] duration-300", device === "phone" ? "w-[375px]" : "w-full")}
                />
              )}
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Links are live in the real email. &ldquo;Send me a test&rdquo; delivers this exact email to your own address.
          </p>
        </div>
      </div>

      <RecipientPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={selectedUsers}
        onToggle={(user) =>
          setSelectedUsers((prev) => {
            const next = new Map(prev);
            if (next.has(user.id)) next.delete(user.id);
            else next.set(user.id, user);
            return next;
          })
        }
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{sendToAll ? "Send to every active user?" : `Send to ${recipientCount} ${recipientCount === 1 ? "user" : "users"}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{draft.subject.trim()}&rdquo; will be queued for delivery straight away. An email can&apos;t be recalled once it&apos;s sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Send email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
