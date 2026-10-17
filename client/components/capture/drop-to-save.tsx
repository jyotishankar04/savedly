"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download04Icon as DropIcon } from "@hugeicons/core-free-icons";
import { useQuickSave } from "@/components/capture/quick-save";
import { MEMORY_DRAG_TYPE } from "@/lib/memory-drag";

/** More than this at once is more likely a mistake than a wish to save a whole folder. */
const MAX_FILES = 10;

const hasSaveable = (types: readonly string[]) => types.includes("Files") || types.includes("text/uri-list") || types.includes("text/plain");

/**
 * Drop to save: drag files from the desktop, or a link or picture from
 * another tab, anywhere onto the app and it's saved, each with its own
 * toast and Undo. Drags that start inside the app (memory cards, links) are
 * left alone, as is anything dropped while a dialog is open, such as Quick
 * Capture with its own drop area.
 */
export function DropToSave() {
  const quickSave = useQuickSave();
  const quickSaveRef = useRef(quickSave);
  useEffect(() => {
    quickSaveRef.current = quickSave;
  });
  const reduced = useReducedMotion();
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    let inside = false; // a drag that began on this page
    let depth = 0; // enter and leave fire for every element crossed

    const wanted = (e: DragEvent) =>
      !inside &&
      !!e.dataTransfer &&
      hasSaveable(e.dataTransfer.types) &&
      !e.dataTransfer.types.includes(MEMORY_DRAG_TYPE) &&
      !document.querySelector('[role="dialog"], [role="alertdialog"]');

    const onDragStart = () => {
      inside = true;
    };
    const onDragEnd = () => {
      inside = false;
    };
    const onDragEnter = (e: DragEvent) => {
      if (!wanted(e)) return;
      depth += 1;
      setShowing(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!wanted(e)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = "copy";
    };
    const onDragLeave = (e: DragEvent) => {
      if (!wanted(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setShowing(false);
    };
    const onDrop = (e: DragEvent) => {
      const take = wanted(e);
      depth = 0;
      setShowing(false);
      inside = false;
      if (!take) return;
      e.preventDefault();
      const transfer = e.dataTransfer!;
      const files = Array.from(transfer.files).slice(0, MAX_FILES);
      if (files.length) {
        // One at a time, so each gets its toast and the uploads don't race the plan's limits.
        void files.reduce<Promise<void>>((chain, file) => chain.then(() => quickSaveRef.current({ file })), Promise.resolve());
        return;
      }
      // A link or picture from another tab: the first line of uri-list is the address.
      const uri = transfer.getData("text/uri-list").split(/\r?\n/).find((line) => line && !line.startsWith("#"));
      const text = uri || transfer.getData("text/plain");
      if (text.trim()) void quickSaveRef.current({ text });
    };

    window.addEventListener("dragstart", onDragStart);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.15 }}
          // Lets the drop reach the window underneath it.
          className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={reduced ? false : { scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="flex w-full max-w-md flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-primary/50 bg-popover/90 px-8 py-12 text-center shadow-2xl shadow-black/20"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <HugeiconsIcon icon={DropIcon} strokeWidth={2} className="h-7 w-7" />
            </span>
            <p className="text-lg font-semibold text-foreground">Drop to save</p>
            <p className="max-w-xs text-sm text-muted-foreground">Pictures, PDFs, text files, or links from another tab. Each one is saved to your library.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
