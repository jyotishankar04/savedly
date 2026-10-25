"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types/memory";
import type { usePlanLimit } from "@/hooks/use-plan-limit";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { CaptureFlow } from "@/components/capture/capture-flow";
import type { CaptureDialogState } from "./use-capture-dialog";

/** GLOBAL QUICK CAPTURE MODAL. A dialog on a desktop and a bottom
 * sheet on a phone (ResponsiveDialog), holding the capture form. */
export function CaptureDialog({
  capture,
  collections,
  memoryLimit,
}: {
  capture: CaptureDialogState;
  collections: Collection[];
  memoryLimit: ReturnType<typeof usePlanLimit>;
}) {
  const { saveModalOpen, setSaveModalOpen, saveStep, captureMode } = capture;

  return (
    <ResponsiveDialog
      open={saveModalOpen}
      onOpenChange={setSaveModalOpen}
      title={saveStep === "done" ? "Saved" : "Add to Savedly"}
      description="Save a link, a note or a file to your library."
      hideDescription
      className={cn("motion-safe:transition-[max-width] motion-safe:duration-300 motion-safe:ease-out", saveStep === 1 && captureMode === "note" ? "sm:max-w-2xl md:max-h-[90dvh] md:overflow-y-auto" : "sm:max-w-lg")}
    >
      <CaptureFlow capture={capture} collections={collections} memoryLimit={memoryLimit} />
    </ResponsiveDialog>
  );
}
