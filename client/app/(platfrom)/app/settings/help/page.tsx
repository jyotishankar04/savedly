"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Compass01Icon as Compass } from "@hugeicons/core-free-icons";
import { useRestartTour } from "@/components/product-tour";

export default function HelpSettingsPage() {
  const restartTour = useRestartTour();

  return (
    <div className="space-y-6 max-w-md text-xs font-semibold">

      <div className="space-y-1 pb-4 border-b border-border/25">
        <h3 className="text-sm font-bold text-foreground">Help</h3>
        <p className="text-[10px] text-muted-foreground">Get help finding your way around Savedly.</p>
      </div>

      <div className="p-3.5 border border-border bg-card rounded-xl flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Compass} strokeWidth={2.25} className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-foreground">Take the product tour</h4>
            <p className="text-[9.5px] text-muted-foreground mt-0.5 leading-relaxed font-medium">
              A guided walkthrough of quick capture, search, memories, collections, and Ask Savedly.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={restartTour}
          className="shrink-0 h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-3.5 hover:bg-primary/90 transition-colors"
        >
          Start tour
        </button>
      </div>

    </div>
  );
}
