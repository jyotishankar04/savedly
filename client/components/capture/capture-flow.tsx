"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon as Check } from "@hugeicons/core-free-icons";
import type { Collection } from "@/types/memory";
import type { usePlanLimit } from "@/hooks/use-plan-limit";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import { AutoHeight } from "@/components/ui/auto-height";
import { Textarea as ArcTextarea } from "@/components/arc/textarea/textarea";
import { Input as ArcInput } from "@/components/arc/input/input";
import { Button as ArcButton } from "@/components/arc/button/button";
import { Badge as ArcBadge } from "@/components/arc/badge/badge";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { FileDropzone } from "@/components/arc/file-dropzone/file-dropzone";
import { CaptureCollectionPicker } from "@/components/capture/collection-picker";
import { CaptureNote, NOTE_DRAFT_KEY } from "@/components/notes/capture-note";
import type { CaptureDialogState } from "@/components/app-shell/use-capture-dialog";

/** The quick-capture form: the Link or file / Note tabs, then the "Saved" step. Used by the dialog and by the capture page. */
export function CaptureFlow({
  capture,
  collections,
  memoryLimit,
}: {
  capture: CaptureDialogState;
  collections: Collection[];
  memoryLimit: ReturnType<typeof usePlanLimit>;
}) {
  const router = useRouter();
  const {
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
  } = capture;

  return (
    <>
          {saveStep === 1 && (
            <SegmentedControl
              label="What to add"
              value={captureMode}
              onValueChange={(value) => setCaptureMode(value as "link" | "note")}
              options={[
                { value: "link", label: "Link or file" },
                { value: "note", label: "Note" },
              ]}
              className="mb-5"
            />
          )}

          {/* The box eases to each tab's height (and the dialog to its width) instead of jumping. */}
          <AutoHeight changeKey={`${saveStep}-${captureMode}`}>
          <AnimatePresence mode="wait" initial={false}>
            {saveStep === 1 && captureMode === "note" && (
              <motion.div key="note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.2 }}>
                <CaptureNote
                  collections={collections}
                  formRef={captureFormRef}
                  limit={memoryLimit}
                  onSaved={(memory) => {
                    setSavedTitle(memory.title);
                    setSavedCollections(memory.collections);
                    setSavedNoteId(memory.id);
                    setSaveStep("done");
                  }}
                  onOpenFullPage={(draft) => {
                    try {
                      sessionStorage.setItem(NOTE_DRAFT_KEY, JSON.stringify(draft));
                    } catch {
                      // Private browsing without storage: the full page opens empty.
                    }
                    setSaveModalOpen(false);
                    router.push("/app/notes/new");
                  }}
                />
              </motion.div>
            )}

            {saveStep === 1 && captureMode === "link" && (
              <motion.form
                key="form"
                ref={captureFormRef}
                onSubmit={handleCaptureSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.2 }}
                className="space-y-5 max-md:[&_input]:text-base! max-md:[&_textarea]:text-base!"
              >
                <ArcTextarea
                  label="What do you want to save?"
                  autoFocus
                  rows={4}
                  value={captureText}
                  onChange={(e) => setCaptureText(e.target.value)}
                  onPaste={handleCapturePaste}
                  placeholder="Paste a link, or write a note"
                  // Says what Savedly takes it to be, and changes as you type.
                  description={captureText.trim() || captureAttachment ? `Saving as: ${detectedTypeLabel === "Website" ? "website" : detectedTypeLabel}` : undefined}
                />

                {/* One file per save. A picture pasted into the box above lands here too. */}
                <div ref={dropzoneRef}>
                  <FileDropzone
                    multiple={false}
                    maxFiles={1}
                    label="Attach a file"
                    description="Drop it here, paste it, or choose from your device"
                    note="An image, PDF or document"
                    listPlacement="inside"
                    compactAt={1}
                    onUpload={uploadForCapture}
                    onFilesChange={(files) => {
                      if (files.length === 0) clearAttachment();
                    }}
                  />
                </div>

                <ArcInput
                  label="Title"
                  placeholder="Optional. Written for you if left empty"
                  value={captureTitle}
                  onChange={(e) => setCaptureTitle(e.target.value)}
                />

                <CaptureCollectionPicker collections={collections} selectedIds={captureCollectionIds} onChange={setCaptureCollectionIds} />

                {memoryLimit.isAtLimit ? (
                  <PlanLimitNotice message={memoryLimit.message ?? "You've reached your memory limit."} />
                ) : (
                  saveError && (
                    <p role="alert" className="text-sm text-destructive">
                      {saveError}
                    </p>
                  )
                )}

                <ArcButton
                  type="submit"
                  size="lg"
                  loading={isSaving}
                  disabled={isUploadingAttachment || memoryLimit.isAtLimit || (!captureText.trim() && !captureAttachment)}
                  title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
                  className="w-full"
                >
                  {memoryLimit.isAtLimit ? "Limit reached" : isUploadingAttachment ? "Uploading the file…" : "Save"}
                </ArcButton>
              </motion.form>
            )}

            {saveStep === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 py-3 text-center"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <HugeiconsIcon icon={Check} strokeWidth={2.5} className="h-5 w-5" />
                </div>

                <div className="space-y-1">
                  <p className="text-base font-medium text-balance text-foreground">{savedTitle}</p>
                  <p className="text-sm text-muted-foreground">It&apos;s in your library. A summary and tags are added in a moment.</p>
                </div>

                {savedCollections.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {savedCollections.map((c) => (
                      <Link key={c.id} href={`/app/collections/${c.id}`} onClick={() => setSaveModalOpen(false)}>
                        <ArcBadge tone="info" size="sm">
                          {c.name}
                        </ArcBadge>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <ArcButton variant="secondary" className="flex-1" onClick={() => openCaptureModal(savedNoteId ? "note" : "link")}>
                    {savedNoteId ? "Write another" : "Save another"}
                  </ArcButton>
                  <ArcButton
                    className="flex-1"
                    onClick={() => {
                      setSaveModalOpen(false);
                      router.push(savedNoteId ? `/app/notes/${savedNoteId}` : "/app/memories");
                    }}
                  >
                    {savedNoteId ? "Open the note" : "View memories"}
                  </ArcButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </AutoHeight>
    </>
  );
}
