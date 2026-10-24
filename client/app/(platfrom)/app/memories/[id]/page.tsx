"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GlobeIcon as Globe,
  Video01Icon as Video,
  FileTextIcon as FileText,
  StickyNote01Icon as StickyNote,
  Image01Icon as ImageIcon,
  Mic01Icon as Mic,
  StarIcon as Star,
  ExternalLinkIcon as ExternalLink,
  ArrowLeft01Icon as ArrowLeft,
  Copy01Icon as Copy,
  Tick02Icon as Tick,
  PencilEdit02Icon as Pencil,
  Folder01Icon as Folder,
  AlarmClockIcon as Alarm,
} from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { MemoryActionsMenu } from "@/components/memory/memory-actions-menu";
import { useRemindMe } from "@/components/memory/remind-me";
import { MemoryHighlights } from "@/components/memory/memory-highlights";
import { formatRemindAt } from "@/lib/remind";
import { memoryQueryKey, useMemoryQuery, useToggleFavoriteMutation, useUpdateMemoryMutation } from "@/context/MemoryContext";
import { toast } from "@/components/ui/toast";
import { EditableTitle } from "@/components/memory/editable-title";
import { timeAgo } from "@/lib/time";
import { isMemoryProcessing } from "@/lib/memory-processing";
import { getPlatformFallback } from "@/lib/platform-fallback";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import type { MemoryDetail } from "@/types/memory";
import { NoteBody, NoteEditor } from "@/components/notes/note-editor";
import { SocialPostView } from "@/components/memory/social-post";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useQueryClient } from "@tanstack/react-query";
import { reprocessMemory } from "@/lib/memories";
import { readableFields } from "@/lib/extracted-fields";

function attachmentFilename(fileUrl: string): string {
  return fileUrl.split("/").pop() ?? fileUrl;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const TYPE_META = {
  web: { icon: Globe, label: "Link" },
  video: { icon: Video, label: "Video" },
  note: { icon: StickyNote, label: "Note" },
  image: { icon: ImageIcon, label: "Image" },
  document: { icon: FileText, label: "Document" },
  voice: { icon: Mic, label: "Voice note" },
} as const;

// A note that's really a command or a code snippet reads better in mono,
// with its line breaks and indentation kept exactly.
const COMMAND_START = /^\s*(\$ |sudo |docker |npm |npx |pnpm |yarn |git |curl |wget |cd |ls |kubectl |python3? |node |go |cargo |brew |apt |ssh |export |echo )/;
function looksLikeCode(memory: MemoryDetail): boolean {
  const text = memory.content ?? "";
  if (!text.trim()) return false;
  // Written in the note editor (fences, lists, headings, quotes): shown formatted, code blocks included.
  if (/^\s*(#{1,6} |[-*+] |\d+[.)] |> )|```/m.test(text)) return false;
  if (memory.contentType && /code|command|snippet|script/i.test(memory.contentType)) return true;
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.length > 0 && lines.every((l) => COMMAND_START.test(l) || /^\s{2,}\S/.test(l) || /[;{}]\s*$/.test(l));
}

// Platforms whose posts and videos Savedly can read (server: url-processor/social), and the
// short links that lead to them (server: url-processor/short-links.ts).
const SOCIAL_PLATFORMS = new Set(["youtube", "x", "instagram", "tiktok", "threads", "linkedin", "reddit", "facebook"]);
const SHORT_LINK_HOSTS = new Set(["lnkd.in", "t.co", "redd.it", "vm.tiktok.com", "vt.tiktok.com", "fb.me", "fb.watch", "instagr.am", "bit.ly", "tinyurl.com", "ow.ly", "buff.ly"]);
function isShortLink(url: string): boolean {
  try {
    return SHORT_LINK_HOSTS.has(new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return false;
  }
}


function formatSavedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** "en.wikipedia.org" from a link, for the source list. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function MemoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: memory, isLoading, isError } = useMemoryQuery(id);
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const updateMutation = useUpdateMemoryMutation();
  const remindMe = useRemindMe();
  // Read once: whether a reminder is still to come only needs to be right when the page opens.
  const [openedAt] = useState(() => Date.now());

  // Opening it is reading it: out of the Inbox. Once per memory, and only when it was unread.
  const markedRead = useRef<string | null>(null);
  const markRead = updateMutation.mutate;
  useEffect(() => {
    if (!memory || memory.readAt !== null || markedRead.current === memory.id) return;
    markedRead.current = memory.id;
    markRead({ id: memory.id, patch: { isRead: true } });
  }, [memory, markRead]);

  // `content` is the body of a "note" memory, and for every other type the
  // caption the user typed alongside a link or file. Both are edited here,
  // off a local draft seeded from memory.content when editing starts.
  const [draftNote, setDraftNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [readingPost, setReadingPost] = useState(false);
  const [viewingPicture, setViewingPicture] = useState(false);
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  // A preview picture that doesn't load (gone, blocked) falls back to the no-preview tile.
  const [previewFailed, setPreviewFailed] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-64 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !memory) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Memory not found</h2>
        <button onClick={() => router.push("/app/memories")} className="text-xs font-bold text-primary hover:underline">
          Back to library
        </button>
      </div>
    );
  }

  const meta = TYPE_META[memory.type] ?? TYPE_META.note;
  const processing = isMemoryProcessing(memory);
  const isNote = memory.type === "note";
  const code = isNote && looksLikeCode(memory);
  // Short facts the AI pulled out (a date, a price, a project name) — not
  // long restatements, and nothing that just repeats the note itself.
  const details = readableFields(memory.extractedFields, [memory.content, memory.title]);

  const startEditing = () => {
    setDraftNote(memory.content ?? "");
    setIsEditing(true);
  };
  const saveEditing = () => {
    updateMutation.mutate({ id: memory.id, patch: { content: draftNote.trim() } });
    setIsEditing(false);
  };
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(memory.content ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the text stays selectable.
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-xs font-semibold hover:text-foreground flex items-center gap-1 text-muted-foreground transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-4 w-4" /> Back to library
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleFavoriteMutation.mutate({ id: memory.id, isFavorite: !memory.isFavorite })}
            aria-label={memory.isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={memory.isFavorite}
            className="h-9 w-9 rounded-full border border-border/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-amber-500 transition-colors"
          >
            <HugeiconsIcon icon={Star} strokeWidth={2.25} className={cn("h-4 w-4", memory.isFavorite && "fill-amber-500 text-amber-500")} />
          </button>
          <MemoryActionsMenu memory={memory} redirectTo="/app/memories" />
        </div>
      </div>

      {/* Title */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[10px] font-bold text-foreground">
            <HugeiconsIcon icon={meta.icon} strokeWidth={2.25} className="h-3.5 w-3.5 text-primary" />
            {meta.label}
          </span>
          {memory.source && !isNote && (
            <span className="text-[11px] font-medium text-muted-foreground truncate max-w-xs">{memory.source}</span>
          )}
          {processing && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary">
              <LogoMark ticks={false} className="h-3 w-3 animate-pulse" />
              Reading it now
            </span>
          )}
        </div>
        <EditableTitle id={memory.id} title={memory.title} className="text-2xl font-bold tracking-tight text-foreground text-balance break-words" />
        <p className="text-xs text-muted-foreground">
          Saved {formatSavedDate(memory.createdAt)} · {timeAgo(memory.createdAt)}
          {memory.remindAt && new Date(memory.remindAt).getTime() > openedAt && (
            <>
              {" · "}
              <button type="button" onClick={() => void remindMe.remind([memory])} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <HugeiconsIcon icon={Alarm} strokeWidth={2} className="h-3.5 w-3.5" />
                Back {formatRemindAt(memory.remindAt)}
              </button>
            </>
          )}
        </p>
        {remindMe.element}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: the thing itself */}
        <div className="lg:col-span-2 space-y-8">
          {isNote ? (
            <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground">{code ? "Command" : "Note"}</span>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="h-7 rounded-full px-3 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEditing}
                        className="h-7 rounded-full bg-primary px-3 text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={copyContent}
                        className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon icon={copied ? Tick : Copy} strokeWidth={2.25} className={cn("h-3.5 w-3.5", copied && "text-primary")} />
                        {copied ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        // A note is edited full page, in the note editor; code stays a plain text box here.
                        onClick={code ? startEditing : () => router.push(`/app/notes/${memory.id}`)}
                        className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon icon={Pencil} strokeWidth={2.25} className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  className={cn(
                    "block w-full min-h-48 resize-y bg-transparent px-5 py-4 text-foreground focus:outline-none",
                    code ? "font-mono text-[13px] leading-6" : "text-sm leading-7",
                  )}
                  autoFocus
                />
              ) : code ? (
                <pre className="overflow-x-auto px-5 py-4 font-mono text-[13px] leading-6 text-foreground">
                  <code>{memory.content}</code>
                </pre>
              ) : (
                <div className="px-5 py-4 text-sm leading-7 text-foreground">
                  {memory.content ? <NoteBody markdown={memory.content} /> : <span className="text-muted-foreground">This note is empty.</span>}
                </div>
              )}
            </section>
          ) : memory.socialPost ? (
            // A post or video read from its platform: who, what it says, the video with its transcript.
            <SocialPostView post={memory.socialPost} processing={processing} />
          ) : (
            <section className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-muted/40 overflow-hidden relative">
                {processing && (
                  <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-1/3 animate-shine-sweep bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </div>
                )}
                {memory.previewImageUrl && previewFailed !== memory.previewImageUrl ? (
                  // The picture opens full screen here; an uploaded image is shown whole, a link's preview as a banner.
                  <button type="button" onClick={() => setViewingPicture(true)} aria-label="View the picture full screen" className="block w-full cursor-zoom-in">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain preview image */}
                    <img
                      src={memory.previewImageUrl}
                      alt={memory.title}
                      onError={() => setPreviewFailed(memory.previewImageUrl)}
                      className={memory.type === "image" ? "mx-auto max-h-[560px] w-full object-contain" : "w-full aspect-video object-cover"}
                    />
                  </button>
                ) : memory.platform && (memory.type === "web" || memory.type === "video") ? (
                  (() => {
                    const fallback = getPlatformFallback(memory.platform);
                    return (
                      <div className={cn("h-44 flex flex-col items-center justify-center gap-2 text-white", fallback.gradientClassName)}>
                        <HugeiconsIcon icon={meta.icon} strokeWidth={2.25} className="h-8 w-8" />
                        <span className="text-xs font-bold tracking-wide">{fallback.label}</span>
                      </div>
                    );
                  })()
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <HugeiconsIcon icon={meta.icon} strokeWidth={2} className="h-8 w-8 text-primary" />
                    <span className="text-[11px] font-semibold">No preview for this {meta.label.toLowerCase()}</span>
                  </div>
                )}
              </div>

              <ImageLightbox
                images={memory.previewImageUrl ? [{ src: memory.previewImageUrl, alt: memory.title }] : []}
                index={viewingPicture ? 0 : null}
                onIndexChange={() => {}}
                onClose={() => setViewingPicture(false)}
                originalUrl={memory.url ?? undefined}
              />

              {memory.url && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-muted-foreground truncate">{memory.canonicalUrl ?? memory.url}</span>
                  <a
                    href={memory.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    Open original <HugeiconsIcon icon={ExternalLink} strokeWidth={2.25} className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* A post or video saved before Savedly could read them (or whose read failed): read it now. */}
              {!processing && memory.url && ((memory.platform && SOCIAL_PLATFORMS.has(memory.platform)) || isShortLink(memory.url)) && (
                <button
                  type="button"
                  disabled={readingPost}
                  onClick={async () => {
                    setReadingPost(true);
                    try {
                      await reprocessMemory(memory.id, { retitle: true });
                      await queryClient.invalidateQueries({ queryKey: memoryQueryKey(memory.id) });
                      toast.add({ title: "Reading the post", description: "It shows here in a moment.", type: "success" });
                    } catch (err) {
                      toast.add({ title: "Couldn't read it", description: err instanceof Error ? err.message : undefined, type: "error" });
                    } finally {
                      setReadingPost(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {readingPost ? "Reading…" : `Read the ${memory.type === "video" ? "video" : "post"}`}
                </button>
              )}

              {/* Plain-language preview status — never the raw fetchStatus (see docs/URL_CAPTURE_AND_PREVIEW.md's UI copy guidance). */}
              {!processing && memory.previewStatus && memory.previewStatus !== "available" && (
                <p className="text-[10px] text-muted-foreground">
                  {memory.previewSource === "browser"
                    ? "Preview captured from your browser."
                    : `Preview unavailable${memory.platform ? ` · ${getPlatformFallback(memory.platform).label}` : ""}.`}
                </p>
              )}
            </section>
          )}

          {/* Your note — the caption on a link or file ("note" memories edit their body above) */}
          {!isNote && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-foreground">Your note</h2>
                {isEditing ? (
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsEditing(false)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                    <button onClick={saveEditing} className="text-xs font-bold text-primary hover:underline">
                      Save
                    </button>
                  </div>
                ) : (
                  <button onClick={startEditing} className="text-xs font-bold text-primary hover:underline">
                    {memory.content ? "Edit" : "Add a note"}
                  </button>
                )}
              </div>
              <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-sm leading-relaxed text-foreground">
                {isEditing ? (
                  // The note editor, as in Notes: headings, lists, to-dos, / for the rest.
                  <NoteEditor
                    markdown={memory.content}
                    autoFocus
                    placeholder="Why you saved this, or what to do with it. Type / for lists and to-dos"
                    onChange={(value) => setDraftNote(value.markdown)}
                    className="[&>[role=textbox]]:min-h-24"
                  />
                ) : memory.content ? (
                  <NoteBody markdown={memory.content} />
                ) : (
                  <p className="text-xs text-muted-foreground">Nothing yet. A line on why you saved this makes it easier to find later.</p>
                )}
              </div>
            </section>
          )}

          {memory.attachments.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold text-foreground">Attachments</h2>
              <AttachmentGroup>
                {memory.attachments.map((attachment) => (
                  <Attachment key={attachment.id} orientation="vertical">
                    <AttachmentTrigger render={<a href={attachment.fileUrl} target="_blank" rel="noreferrer" />} />
                    <AttachmentMedia variant={attachment.mimeType?.startsWith("image/") ? "image" : "icon"}>
                      {attachment.mimeType?.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain attachment thumbnail
                        <img src={attachment.fileUrl} alt="" />
                      ) : (
                        <HugeiconsIcon icon={FileText} strokeWidth={2.25} />
                      )}
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{attachmentFilename(attachment.fileUrl)}</AttachmentTitle>
                      <AttachmentDescription>
                        {[attachment.mimeType, formatFileSize(attachment.fileSize)].filter(Boolean).join(" · ")}
                      </AttachmentDescription>
                    </AttachmentContent>
                  </Attachment>
                ))}
              </AttachmentGroup>
            </section>
          )}

          <MemoryHighlights memoryId={memory.id} highlights={memory.highlights ?? []} />
        </div>

        {/* Right: what Savedly made of it */}
        <aside className="rounded-2xl border border-border/60 bg-card p-5 space-y-5 lg:sticky lg:top-6">
          <div className="flex items-center gap-2">
            <LogoMark ticks={false} className="h-4 w-4" />
            <h2 className="text-xs font-bold text-foreground">What Savedly understood</h2>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[10px] font-semibold text-muted-foreground">Summary</h3>
            <p className="text-xs leading-relaxed text-foreground/90">
              {memory.description ||
                (processing ? "Still reading this. The summary appears here in a few seconds." : "No summary for this one.")}
            </p>
          </div>

          {memory.webResearch && memory.webResearch.sources.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground">Looked up on the web</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The note alone didn&apos;t say what this is, so Savedly searched for &ldquo;{memory.webResearch.query}&rdquo;.
              </p>
              <div className="flex flex-col gap-1">
                {memory.webResearch.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    <HugeiconsIcon icon={Globe} strokeWidth={2} className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{source.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{hostOf(source.url)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold text-muted-foreground">Tags</h3>
            {memory.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {memory.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/app/tags/${encodeURIComponent(tag)}`}
                    className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{processing ? "Coming up…" : "No tags yet."}</p>
            )}
          </div>

          {memory.collections.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground">In collections</h3>
              <div className="flex flex-col gap-1">
                {memory.collections.map((collection) => (
                  <Link
                    key={collection.id}
                    href={`/app/collections/${collection.id}`}
                    className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <HugeiconsIcon icon={Folder} strokeWidth={2} className="h-4 w-4 text-primary" />
                    <span className="truncate">{collection.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {details.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground">Details</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {details.map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-[10px] text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-xs font-medium text-foreground break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="border-t border-border/50 pt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">Saved</p>
              <p className="mt-0.5 font-medium text-foreground">{formatSavedDate(memory.createdAt)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">Type</p>
              <p className="mt-0.5 font-medium text-foreground">{meta.label}</p>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
