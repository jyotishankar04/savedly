"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusIcon as Plus, Menu01Icon as Menu, MessageSquarePlusIcon as MessageSquarePlus, HistoryIcon as History } from "@hugeicons/core-free-icons";
import type { usePlanLimit } from "@/hooks/use-plan-limit";
import { LimitDot } from "@/components/plan-limit-notice";
import type { SidebarController } from "./use-sidebar";

/** Floating dock — replaces the collapsed sidebar, docked at the
 * left-center of the screen like a desktop app dock. */
export function FloatingDock({
  sidebar,
  memoryLimit,
  openCaptureModal,
}: {
  sidebar: SidebarController;
  memoryLimit: ReturnType<typeof usePlanLimit>;
  openCaptureModal: () => void;
}) {
  const pathname = usePathname();
  const { phase: sidebarPhase, fullyCollapsed: sidebarFullyCollapsed, menuButtonRef, toggleFlyout } = sidebar;

  if (!(sidebarFullyCollapsed || sidebarPhase === "showing")) return null;

  return (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-1.5 p-1.5 rounded-full bg-card/95 border border-border/60 shadow-lg backdrop-blur-sm">
          {sidebarFullyCollapsed && (
            <button
              ref={menuButtonRef}
              type="button"
              onClick={toggleFlyout}
              className="h-10 w-10 rounded-full border border-primary/30 bg-primary/10 text-primary shadow-sm flex items-center justify-center hover:bg-primary/15 transition-colors shrink-0"
              aria-label="Open sidebar menu (Ctrl+M)"
            >
              <HugeiconsIcon icon={Menu} strokeWidth={2.25} className="h-4 w-4" />
            </button>
          )}

          {/* Shares layoutId with the sidebar's Quick Capture button so it
              smoothly morphs between the two on collapse/expand. Stays
              mounted through "showing" too so it's still there to slide
              back to dock. */}
          {(sidebarPhase === "collapsed" || sidebarPhase === "showing") && (
            <motion.button
              layoutId="quick-capture-fab"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              type="button"
              onClick={() => openCaptureModal()}
              title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
              className="relative h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-sm flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
              aria-label="Quick Capture (Ctrl+Q)"
            >
              <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" />
              {memoryLimit.isAtLimit && <LimitDot />}
            </motion.button>
          )}

          {/* Ask's own thread history normally lives in its on-page sidebar,
              but that sidebar has nowhere to dock once the main nav is fully
              collapsed — it was rendering flush against this floating dock
              instead. These two just dispatch events; AskPage (mounted as
              `children`) owns the actual new-chat/history logic and can't be
              called directly from here across the layout boundary. */}
          {sidebarFullyCollapsed && pathname === "/app/ask" && (
            <>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("ask:new-chat"))}
                className="h-10 w-10 rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors shrink-0"
                aria-label="New chat (Ctrl+J)"
              >
                <HugeiconsIcon icon={MessageSquarePlus} strokeWidth={2.25} className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("ask:open-history"))}
                className="h-10 w-10 rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors shrink-0"
                aria-label="Chat history (Ctrl+H)"
              >
                <HugeiconsIcon icon={History} strokeWidth={2.25} className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
  );
}
