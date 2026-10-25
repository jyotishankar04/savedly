"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileDropzoneUpload } from "@/components/arc/file-dropzone/file-dropzone";
import { DuplicateSkippedError, type useMemories } from "@/context/MemoryContext";
import type { usePlanLimit } from "@/hooks/use-plan-limit";
import { detectMemoryType, deriveTitle, splitLinkAndCaption } from "@/lib/detect-memory-type";
import { uploadFile, type UploadedFile } from "@/lib/uploads";

type CaptureOptions = {
  create: ReturnType<typeof useMemories>["create"];
  memoryLimit: ReturnType<typeof usePlanLimit>;
  storageLimit: ReturnType<typeof usePlanLimit>;
};

/** The quick-capture dialog's state: what's typed or attached, whether it's saving, and what the "saved" step shows. */
export function useCaptureDialog({ create, memoryLimit, storageLimit }: CaptureOptions) {
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveStep, setSaveStep] = useState<1 | "done">(1);
  // The capture dialog's two tabs: a link or file (one box that works out what was pasted), or a note in the editor.
  const [captureMode, setCaptureMode] = useState<"link" | "note">("link");
  // The note just saved from the Note tab, for the done step's "Open the note".
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [captureCollectionIds, setCaptureCollectionIds] = useState<string[]>([]);
  const [captureAttachment, setCaptureAttachment] = useState<UploadedFile | null>(null);
  const [captureAttachmentName, setCaptureAttachmentName] = useState<string | null>(null);
  const [captureAttachmentMimeType, setCaptureAttachmentMimeType] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const captureFormRef = useRef<HTMLFormElement>(null);
  const [savedTitle, setSavedTitle] = useState("");
  const [savedCollections, setSavedCollections] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The single source of truth for "what kind of memory is this" — rule-based
  // for now, but isolated in lib/detect-memory-type.ts so it's a one-place
  // swap for a real AI classifier later.
  const detectedType = useMemo(
    () => detectMemoryType({ text: captureText, attachmentMimeType: captureAttachmentMimeType }),
    [captureText, captureAttachmentMimeType],
  );
  const detectedTypeLabel = detectedType === "web" ? "Website" : detectedType;
  const openCaptureModal = useCallback((mode: "link" | "note" = "link") => {
    setSaveStep(1);
    setCaptureMode(mode);
    setSavedNoteId(null);
    setCaptureTitle("");
    setCaptureText("");
    setCaptureCollectionIds([]);
    setCaptureAttachment(null);
    setCaptureAttachmentName(null);
    setCaptureAttachmentMimeType(null);
    setSaveError(null);
    setSaveModalOpen(true);
  }, [
    setSaveStep,
    setCaptureMode,
    setSavedNoteId,
    setCaptureTitle,
    setCaptureText,
    setCaptureCollectionIds,
    setCaptureAttachment,
    setCaptureAttachmentName,
    setCaptureAttachmentMimeType,
    setSaveError,
    setSaveModalOpen,
  ]);

  // Pages (e.g. Home's quick-save shortcuts) open this modal by event, so
  // they don't need a route of their own or a context just for one call.
  const openCaptureModalRef = useRef(openCaptureModal);
  useEffect(() => {
    openCaptureModalRef.current = openCaptureModal;
  });
  useEffect(() => {
    // `detail.mode: "note"` opens it on the Note tab (Home's "Write a note").
    const open = (event: Event) => openCaptureModalRef.current((event as CustomEvent<{ mode?: string } | null>).detail?.mode === "note" ? "note" : "link");
    window.addEventListener("capture:open", open);
    return () => window.removeEventListener("capture:open", open);
  }, []);

  // The dropzone calls this for the file it was given. A rejection's message
  // becomes the reason shown on the file's row.
  const uploadForCapture: FileDropzoneUpload = async (item) => {
    if (!item.file) return;
    if (storageLimit.isAtLimit) throw new Error(storageLimit.message ?? "You've reached your storage limit.");
    // Name and type first, so the "Saving as" line is right while it uploads.
    setCaptureAttachmentName(item.name);
    setCaptureAttachmentMimeType(item.file.type);
    setIsUploadingAttachment(true);
    try {
      setCaptureAttachment(await uploadFile(item.file));
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const clearAttachment = () => {
    setCaptureAttachment(null);
    setCaptureAttachmentName(null);
    setCaptureAttachmentMimeType(null);
  };

  // A picture pasted into the text box (a screenshot, say) is handed to the
  // dropzone as if it had been chosen there, so there is one place a file
  // shows, uploads and can be removed.
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const handleCapturePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(e.clipboardData?.items ?? []).find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
    const picker = dropzoneRef.current?.querySelector<HTMLInputElement>('input[type="file"]');
    if (!file || !picker) return;
    e.preventDefault();
    const transfer = new DataTransfer();
    transfer.items.add(file);
    picker.files = transfer.files;
    picker.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim() && !captureAttachment) return;
    if (memoryLimit.isAtLimit) {
      setSaveError(memoryLimit.message ?? "You've reached your memory limit.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const title = captureTitle.trim() || deriveTitle(detectedType, captureText, captureAttachmentName);
      // A pasted link often comes with commentary ("check this out
      // https://... thoughts?") — split it so the URL lands in `url` and
      // whatever's left becomes the caption, instead of the whole blob
      // getting shoved into the url field.
      const { url: extractedUrl, caption } = splitLinkAndCaption(captureText);
      const isLink = detectedType === "web" || detectedType === "video";
      const payload = {
        type: detectedType,
        title,
        url: isLink ? extractedUrl?.href : undefined,
        // For a note, the whole field is the content. For an attachment
        // (image/document), the field is free for a caption instead — an
        // attachment never consumes captureText, so whatever's typed there
        // should still be saved alongside the file rather than dropped. For
        // a link, whatever text was left after pulling the URL out becomes
        // the caption.
        content: detectedType === "note" || captureAttachment ? captureText.trim() || undefined : isLink ? caption || undefined : undefined,
        collectionIds: captureCollectionIds.length > 0 ? captureCollectionIds : undefined,
        attachments: captureAttachment ? [captureAttachment] : undefined,
      };
      const memory = await create(payload);
      // AI ingestion runs async in the background from here — the modal
      // doesn't wait for it. Once it finishes, the enrichment (corrected
      // caption, real title, tags, collection) shows up wherever the memory
      // is viewed next: the memories list, its detail page's "Savedly
      // Understood" panel, and the list's slide-in drawer.
      setSavedTitle(memory.title);
      setSavedCollections(memory.collections);
      setSaveStep("done");
    } catch (err) {
      // Told it's a duplicate and chose to skip: nothing went wrong.
      if (!(err instanceof DuplicateSkippedError)) setSaveError(err instanceof Error ? err.message : "Couldn't save that memory.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveModalOpen,
    setSaveModalOpen,
    saveStep,
    setSaveStep,
    captureMode,
    setCaptureMode,
    savedNoteId,
    setSavedNoteId,
    captureTitle,
    setCaptureTitle,
    captureText,
    setCaptureText,
    captureCollectionIds,
    setCaptureCollectionIds,
    captureAttachment,
    isUploadingAttachment,
    captureFormRef,
    savedTitle,
    setSavedTitle,
    savedCollections,
    setSavedCollections,
    isSaving,
    saveError,
    detectedTypeLabel,
    openCaptureModal,
    uploadForCapture,
    clearAttachment,
    dropzoneRef,
    handleCapturePaste,
    handleCaptureSubmit,
  };
}

export type CaptureDialogState = ReturnType<typeof useCaptureDialog>;
