"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusIcon as Plus, XIcon as X, ClipboardIcon as Clipboard, CheckIcon as Check, FileTextIcon as FileText, PaperclipIcon as Paperclip, CloudUploadIcon as UploadCloud } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment";
import { useCollectionsQuery, useCreateMemoryMutation } from "@/context/MemoryContext";
import { uploadFile, type UploadedFile } from "@/lib/uploads";
import { detectMemoryType, deriveTitle, splitLinkAndCaption } from "@/lib/detect-memory-type";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import { cn } from "@/lib/utils";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { PlanLimitNotice, ProBadge } from "@/components/plan-limit-notice";

/**
 * What arrived with the URL: from the phone's share sheet (the manifest's
 * share_target) or any link with ?text= / ?url= / ?title=. Apps differ in
 * where they put the link — `url`, or inside `text` — so both are kept, and
 * splitLinkAndCaption sorts out which part is the link when saving.
 */
function sharedContent(params: URLSearchParams): { text: string; title: string; hasFile: boolean } {
  const text = params.get("text")?.trim() ?? "";
  const url = params.get("url")?.trim() ?? "";
  const title = params.get("title")?.trim() ?? "";
  return {
    text: [text, url && !text.includes(url) ? url : ""].filter(Boolean).join("\n"),
    // A shared title is only useful when it isn't just the link again.
    title: title && title !== url && title !== text ? title : "",
    // A shared photo or file is waiting where the service worker left it.
    hasFile: params.has("shared-file"),
  };
}

export default function CapturePage() {
  // useSearchParams (the shared content) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CaptureForm />
    </Suspense>
  );
}

function CaptureForm() {
  const router = useRouter();
  const [shared] = useState(sharedContent(useSearchParams()));
  const { data: collections = [] } = useCollectionsQuery();
  const createMemoryMutation = useCreateMemoryMutation();
  const memoryLimit = usePlanLimit("memory_count");
  const storageLimit = usePlanLimit("storage_mb");

  const [captureText, setCaptureText] = useState(shared.text);
  const [captureTitle, setCaptureTitle] = useState(shared.title);
  const [captureCollectionIds, setCaptureCollectionIds] = useState<string[]>([]);
  const [captureAttachment, setCaptureAttachment] = useState<UploadedFile | null>(null);
  const [captureAttachmentName, setCaptureAttachmentName] = useState<string | null>(null);
  const [captureAttachmentMimeType, setCaptureAttachmentMimeType] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reading the clipboard needs a secure page and a tap, hence a button, shown
  // only where the browser can do it (false on the server and on plain http).
  const canPaste = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.clipboard?.readText === "function",
    () => false,
  );

  // Once the shared values are in the form, drop them from the address bar so
  // a refresh or the back button doesn't fill the form in again.
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const pasteFromClipboard = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) setCaptureText(text);
    } catch {
      // Permission denied or an empty clipboard: leave the field for typing.
    }
    textareaRef.current?.focus();
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  // The single source of truth for "what kind of memory is this" — rule-based
  // for now, isolated in lib/detect-memory-type.ts so it's a one-place swap
  // for a real AI classifier later.
  const detectedType = useMemo(
    () => detectMemoryType({ text: captureText, attachmentMimeType: captureAttachmentMimeType }),
    [captureText, captureAttachmentMimeType],
  );
  const DetectedTypeIcon = MEMORY_TYPE_ICONS[detectedType];
  const detectedTypeLabel = detectedType === "web" ? "Website" : detectedType;

  const resetForm = () => {
    setCaptureText("");
    setCaptureTitle("");
    setCaptureCollectionIds([]);
    setCaptureAttachment(null);
    setCaptureAttachmentName(null);
    setCaptureAttachmentMimeType(null);
    setAttachmentError(null);
    setSaveError(null);
  };

  const handleFileUpload = async (file: File) => {
    if (storageLimit.isAtLimit) {
      setAttachmentError(storageLimit.message ?? "You've reached your storage limit.");
      return;
    }
    // Set the name/mime immediately so the attachment preview (with its
    // shimmer) can show the real filename and the right icon while the
    // upload is still in flight, not just once it resolves.
    setCaptureAttachmentName(file.name);
    setCaptureAttachmentMimeType(file.type);
    setIsUploadingAttachment(true);
    setAttachmentError(null);
    try {
      const uploaded = await uploadFile(file);
      setCaptureAttachment(uploaded);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // A photo or file shared to the installed app: the service worker
  // (public/sw.js) parked it in the Cache API, since a file can't travel in a
  // URL. Attach it exactly as if it had been picked here, then clear it.
  const sharedFileTaken = useRef(false);
  useEffect(() => {
    if (!shared.hasFile || sharedFileTaken.current || !("caches" in window)) return;
    sharedFileTaken.current = true;
    void (async () => {
      try {
        const cache = await caches.open("share-target");
        const response = await cache.match("/__shared-file");
        if (!response) return;
        const blob = await response.blob();
        const name = decodeURIComponent(response.headers.get("X-File-Name") ?? "shared-file");
        await cache.delete("/__shared-file");
        await handleFileUpload(new File([blob], name, { type: blob.type }));
      } catch {
        setAttachmentError("Couldn't read the shared file. Attach it here instead.");
      }
    })();
    // Runs once, for the share this page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFileUpload(file);
  };

  const clearAttachment = () => {
    setCaptureAttachment(null);
    setCaptureAttachmentName(null);
    setCaptureAttachmentMimeType(null);
    setAttachmentError(null);
  };

  const handleCapturePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) void handleFileUpload(file);
        return;
      }
    }
  };

  const handleCaptureDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDraggingOver(true);
  };

  const handleCaptureDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) setIsDraggingOver(false);
  };

  const handleCaptureDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFileUpload(file);
  };

  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim() && !captureAttachment) return;
    if (memoryLimit.isAtLimit) {
      setSaveError(memoryLimit.message ?? "You've reached your memory limit.");
      return;
    }
    setSaveError(null);
    try {
      const title = captureTitle.trim() || deriveTitle(detectedType, captureText, captureAttachmentName);
      // A pasted link often comes with commentary ("check this out
      // https://... thoughts?") — split it so the URL lands in `url` and
      // whatever's left becomes the caption, instead of the whole blob
      // getting shoved into the url field.
      const { url: extractedUrl, caption } = splitLinkAndCaption(captureText);
      const isLink = detectedType === "web" || detectedType === "video";
      const memory = await createMemoryMutation.mutateAsync({
        type: detectedType,
        title,
        url: isLink ? extractedUrl?.href : undefined,
        content:
          detectedType === "note" || captureAttachment
            ? captureText.trim() || undefined
            : isLink
              ? caption || undefined
              : undefined,
        collectionIds: captureCollectionIds.length > 0 ? captureCollectionIds : undefined,
        attachments: captureAttachment ? [captureAttachment] : undefined,
      });
      // AI ingestion runs async in the background from here — this page
      // doesn't wait for it. Go straight to the library, where the new
      // memory is at the top and fills in as processing finishes.
      toast.add({ title: "Saved to SaveForLatter", description: memory.title, type: "success" });
      router.push("/app/memories");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save that memory.");
    }
  };

  const isSaving = createMemoryMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Quick Capture</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Paste a link, drop a file, or just start typing a note.
        </p>
      </div>

      <form onSubmit={handleCaptureSubmit} className="space-y-5">
        <input
          type="text"
          placeholder="Untitled memory"
          value={captureTitle}
          onChange={(e) => setCaptureTitle(e.target.value)}
          className="w-full bg-transparent text-2xl md:text-3xl font-semibold text-foreground border-none outline-none focus:outline-none placeholder:text-muted-foreground/25"
        />

        {/* Unified capture surface — paste a link, paste/drop a file, or just type */}
        <div className="relative">
          {isDraggingOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-background/90 backdrop-blur-sm">
              <HugeiconsIcon icon={UploadCloud} strokeWidth={2.25} className="h-5 w-5 text-primary" />
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Drop to attach</p>
            </div>
          )}

          <InputGroup
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={handleCaptureDragEnter}
            onDragLeave={handleCaptureDragLeave}
            onDrop={handleCaptureDrop}
            className={cn(
              "h-auto rounded-2xl border-2 bg-muted/10 transition-colors",
              isDraggingOver ? "border-primary/70" : "border-border/60",
            )}
          >
            <InputGroupTextarea
              ref={textareaRef}
              autoFocus
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              onPaste={handleCapturePaste}
              placeholder="Paste a link, drop a file, or start typing a note..."
              rows={captureAttachment || isUploadingAttachment ? 4 : 7}
              className="px-4 py-3.5 text-sm placeholder:text-muted-foreground/70"
            />

            {(isUploadingAttachment || captureAttachment || attachmentError) && (
              <InputGroupAddon align="block-start" className="w-full justify-start px-3 pb-1">
                <Attachment
                  state={attachmentError ? "error" : isUploadingAttachment ? "uploading" : "done"}
                  size="sm"
                  className="w-full max-w-full border-border/60 bg-background/70"
                >
                  <AttachmentMedia variant={captureAttachmentMimeType?.startsWith("image/") ? "image" : "icon"}>
                    {captureAttachmentMimeType?.startsWith("image/") && captureAttachment ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain preview image
                      <img src={captureAttachment.fileUrl} alt="" />
                    ) : (
                      <HugeiconsIcon icon={FileText} strokeWidth={2.25} />
                    )}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{captureAttachmentName ?? "Attachment"}</AttachmentTitle>
                    <AttachmentDescription>
                      {attachmentError ??
                        (isUploadingAttachment
                          ? "Uploading…"
                          : captureAttachment
                            ? `${(captureAttachment.fileSize / 1024).toFixed(0)} KB`
                            : "")}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction type="button" aria-label={`Remove ${captureAttachmentName ?? "attachment"}`} onClick={clearAttachment}>
                      <HugeiconsIcon icon={X} strokeWidth={2.25} />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </InputGroupAddon>
            )}

            <InputGroupAddon align="block-end" className="w-full justify-between border-t border-border/40 bg-muted/20 px-3 py-2">
              <InputGroupButton
                type="button"
                disabled={storageLimit.isAtLimit}
                title={storageLimit.isAtLimit ? storageLimit.message ?? undefined : undefined}
                onClick={() => fileInputRef.current?.click()}
                className={storageLimit.isAtLimit ? "opacity-50 cursor-not-allowed" : undefined}
              >
                <HugeiconsIcon icon={Paperclip} strokeWidth={2.25} className="h-3.5 w-3.5" />
                Attach
                {storageLimit.isAtLimit && <ProBadge className="ml-1" />}
              </InputGroupButton>

              {canPaste && !captureText && (
                <InputGroupButton type="button" onClick={pasteFromClipboard} className="mr-auto">
                  <HugeiconsIcon icon={Clipboard} strokeWidth={2.25} className="h-3.5 w-3.5" />
                  Paste
                </InputGroupButton>
              )}

              <InputGroupText className="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-primary">
                <HugeiconsIcon icon={DetectedTypeIcon} strokeWidth={2.25} className="h-3 w-3" />
                {detectedTypeLabel}
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>

          <input ref={fileInputRef} type="file" onChange={handleAttachmentSelect} className="hidden" />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Add to</span>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {collections.length > 0 ? (
              collections.map((col) => {
                const isSelected = captureCollectionIds.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() =>
                      setCaptureCollectionIds((prev) =>
                        prev.includes(col.id) ? prev.filter((id) => id !== col.id) : [...prev, col.id],
                      )
                    }
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors",
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-background border-input text-muted-foreground hover:border-primary/20",
                    )}
                  >
                    <span>{col.icon}</span>
                    {col.name}
                    {isSelected && <HugeiconsIcon icon={Check} strokeWidth={2.25} className="h-2.5 w-2.5 stroke-[3]" />}
                  </button>
                );
              })
            ) : (
              <span className="text-[10px] text-muted-foreground">No collections yet.</span>
            )}
          </div>
        </div>

        {memoryLimit.isAtLimit ? (
          <PlanLimitNotice message={memoryLimit.message ?? "You've reached your memory limit."} />
        ) : (
          saveError && <p className="text-[10px] text-red-500">{saveError}</p>
        )}

        <div className="flex items-center justify-end gap-4 border-t border-border/20 pt-5">
          <button
            type="button"
            onClick={resetForm}
            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
          <Button
            type="submit"
            disabled={isSaving || isUploadingAttachment || memoryLimit.isAtLimit || (!captureText.trim() && !captureAttachment)}
            title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
            className={cn(
              "h-11 px-7 rounded-full font-bold text-xs bg-primary text-white flex items-center gap-1.5",
              memoryLimit.isAtLimit && "opacity-50 cursor-not-allowed",
            )}
          >
            {isSaving ? "Saving..." : memoryLimit.isAtLimit ? (
              <>
                Limit reached <ProBadge />
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" /> Save Memory
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
