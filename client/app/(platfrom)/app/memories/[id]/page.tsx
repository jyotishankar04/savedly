"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { GlobeIcon as Globe, Video01Icon as Video, FileTextIcon as FileText, StickyNote01Icon as StickyNote, Image01Icon as ImageIcon, StarIcon as Star, ExternalLinkIcon as ExternalLink, ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { MemoryActionsMenu } from "@/components/memory/memory-actions-menu";
import {
  useMemoryQuery,
  useToggleFavoriteMutation,
  useUpdateMemoryMutation,
} from "@/context/MemoryContext";
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

function attachmentFilename(fileUrl: string): string {
  return fileUrl.split("/").pop() ?? fileUrl;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const TYPE_ICONS = { web: Globe, video: Video, note: StickyNote, image: ImageIcon, document: FileText, voice: StickyNote };

export default function MemoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: memory, isLoading, isError } = useMemoryQuery(id);
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const updateMutation = useUpdateMemoryMutation();

  // For a "note" memory, `content` IS the memory body and already renders in
  // the preview above. For every other type, `content` is whatever caption
  // the user typed alongside a link/attachment at capture time — that's what
  // this "Your Note" box edits and persists back to the same field. Editing
  // works off a local draft seeded from memory.content when edit mode opens,
  // rather than mirroring memory.content into state on every load.
  const [draftNote, setDraftNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between border-b border-border/20 pb-4">
          <Skeleton className="h-4 w-28" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
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

  const TypeIcon = TYPE_ICONS[memory.type];

  const handleToggleEditing = () => {
    if (isEditing) {
      updateMutation.mutate({ id: memory.id, patch: { content: draftNote.trim() } });
      setIsEditing(false);
    } else {
      setDraftNote(memory.content ?? "");
      setIsEditing(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8 animate-fade-in">

      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border/20 pb-4">
        <button
          onClick={() => router.back()}
          className="text-xs font-semibold hover:text-primary flex items-center gap-1 text-muted-foreground transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-4 w-4" /> Back to library
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleFavoriteMutation.mutate({ id: memory.id, isFavorite: !memory.isFavorite })}
            className="h-9 w-9 rounded-full border border-border/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-amber-500 transition-colors"
          >
            <HugeiconsIcon icon={Star} strokeWidth={2.25} className={cn("h-4 w-4", memory.isFavorite ? "fill-amber-500 text-amber-500" : "")} />
          </button>

          <MemoryActionsMenu memory={memory} redirectTo="/app/memories" />
        </div>
      </div>

      {/* Main Split grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Left 2 columns: Preview & User Notes */}
        <div className="md:col-span-2 space-y-8">

          {/* Visual Source Preview */}
          <div className="space-y-3">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
              {memory.type.toUpperCase()} PREVIEW
            </span>

            <div className="rounded-xl border border-border/45 bg-muted/75 p-1 shadow-xs">
              <div className="aspect-video w-full rounded-lg bg-muted border border-border/75 flex flex-col items-center justify-center gap-3 relative overflow-hidden text-xs text-muted-foreground font-bold">
                {isMemoryProcessing(memory) && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
                    <div className="absolute inset-y-0 left-0 w-1/3 animate-shine-sweep bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  </div>
                )}
                {memory.previewImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain preview image
                  <img src={memory.previewImageUrl} alt={memory.title} className="w-full h-full object-cover" />
                ) : memory.platform && (memory.type === "web" || memory.type === "video") ? (
                  (() => {
                    const fallback = getPlatformFallback(memory.platform);
                    return (
                      <div className={cn("absolute inset-0 flex flex-col items-center justify-center gap-2 text-white", fallback.gradientClassName)}>
                        <HugeiconsIcon icon={TypeIcon} strokeWidth={2.25} className="h-8 w-8" />
                        <span className="text-xs font-bold tracking-wide">{fallback.label}</span>
                      </div>
                    );
                  })()
                ) : memory.type === "video" ? (
                  <>
                    <HugeiconsIcon icon={Video} strokeWidth={2.25} className="h-10 w-10 text-red-500" />
                    <span>Video preview</span>
                  </>
                ) : memory.type === "note" ? (
                  <>
                    <HugeiconsIcon icon={StickyNote} strokeWidth={2.25} className="h-10 w-10 text-primary" />
                    <p className="max-w-sm px-6 text-[10px] font-medium text-foreground text-center whitespace-pre-wrap">
                      {memory.content}
                    </p>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={TypeIcon} strokeWidth={2.25} className="h-10 w-10 text-primary" />
                    <span>{memory.type === "web" ? "Website" : memory.type} preview</span>
                  </>
                )}
              </div>
            </div>

            {(memory.url || memory.source) && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-mono text-muted-foreground truncate max-w-sm">{memory.source ?? memory.url}</span>
                {memory.url && (
                  <a
                    href={memory.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-bold hover:underline flex items-center gap-0.5"
                  >
                    Open original <HugeiconsIcon icon={ExternalLink} strokeWidth={2.25} className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Plain-language preview status — never the raw fetchStatus (see docs/URL_CAPTURE_AND_PREVIEW.md's UI copy guidance). */}
            {!isMemoryProcessing(memory) && memory.previewStatus && memory.previewStatus !== "available" && (
              <p className="text-[10px] text-muted-foreground pt-0.5">
                {memory.previewSource === "browser"
                  ? "Preview captured from your browser."
                  : `Preview unavailable${memory.platform ? ` · ${getPlatformFallback(memory.platform).label}` : ""}.`}
              </p>
            )}
          </div>

          {/* User Notes editor — not shown for "note" memories, whose body already is memory.content */}
          {memory.type !== "note" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  Your Note
                </span>
                <button
                  onClick={handleToggleEditing}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {isEditing ? "Done" : "Edit note"}
                </button>
              </div>

              <div className="rounded-xl border border-border/45 bg-muted/75 p-1 shadow-xs">
                <div className="p-4 rounded-lg border border-border/75 bg-card min-h-[100px] text-xs leading-relaxed text-foreground">
                  {isEditing ? (
                    <textarea
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      className="w-full bg-transparent resize-none focus:outline-none"
                      rows={4}
                      autoFocus
                    />
                  ) : (
                    <p>{memory.content || "No custom note added. Click edit to save context reasons."}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attachments */}
          {memory.attachments.length > 0 && (
            <div className="space-y-3">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
                Attachments
              </span>
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
            </div>
          )}

        </div>

        {/* Right column: SaveForLatter AI Understanding metadata */}
        <div className="space-y-6">

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-primary">
                <LogoMark ticks={false} className="h-4 w-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">SaveForLatter understood</h3>
              </div>
              {isMemoryProcessing(memory) && (
                <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[8px] font-bold text-primary">
                  <LogoMark ticks={false} className="h-3 w-3 animate-pulse" />
                  Processing
                </span>
              )}
            </div>

            <div className="rounded-xl border border-border/45 bg-muted/75 p-1 shadow-xs">
              <div className="p-4 rounded-lg border border-border/75 bg-card space-y-4 text-xs">

                {/* Description */}
                <div className="space-y-1">
                  <span className="text-[8px] font-mono text-muted-foreground block">DESCRIPTION</span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {memory.description ||
                      (isMemoryProcessing(memory)
                        ? "Still processing — this updates automatically in a few seconds."
                        : "No description saved for this memory yet.")}
                  </p>
                </div>

                {/* Topics */}
                <div className="space-y-1.5">
                  <span className="text-[8px] font-mono text-muted-foreground block">TAGS</span>
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.length > 0 ? (
                      memory.tags.map(t => (
                        <span key={t} className="text-[8px] font-bold uppercase bg-primary/5 border border-primary/10 text-primary px-2 py-0.5 rounded">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No tags yet</span>
                    )}
                  </div>
                </div>

                {/* Collections */}
                {memory.collections.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/20">
                    <span className="text-[8px] font-mono text-muted-foreground block">IN COLLECTIONS</span>
                    <div className="flex flex-wrap gap-1">
                      {memory.collections.map(c => (
                        <Link
                          key={c.id}
                          href={`/app/collections/${c.id}`}
                          className="text-[8px] font-bold uppercase bg-primary/5 border border-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/10 transition-colors"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="space-y-1 pt-2 border-t border-border/20">
                  <span className="text-[8px] font-mono text-muted-foreground block">CAPTURED ON</span>
                  <p className="text-[10px] text-foreground font-semibold">{timeAgo(memory.createdAt)}</p>
                </div>

              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Local animation keyframes */}
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
