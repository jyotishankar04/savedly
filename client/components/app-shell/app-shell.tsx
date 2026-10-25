"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NextStepProvider, NextStep } from "nextstepjs";
import { useNextAdapter } from "nextstepjs/adapters/next";
import { useUser } from "@/context/UserContext";
import { useInboxCountQuery, useMemories } from "@/context/MemoryContext";
import { SidebarStateProvider } from "@/context/SidebarContext";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { useUnreadCountQuery } from "@/hooks/use-notifications";
import { useSyncTimeZone } from "@/hooks/use-settings-group";
import { SetupPanel } from "@/components/setup/setup-panel";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AccentColor } from "@/components/accent-color";
import { DuplicateAskHost } from "@/components/memory/duplicate-dialog";
import { useMemoryListKeys } from "@/components/memory/list-keys";
import { DropToSave } from "@/components/capture/drop-to-save";
import { productTourSteps, TourCard, TourAutoStart } from "@/components/product-tour";
import { AskWidget } from "@/components/ask-widget/ask-widget";
import { ExtensionInstallPrompt } from "@/components/extension/install-prompt";
import { UpgradeDialog } from "@/components/upgrade-dialog";
import { buildNav } from "./nav";
import { useSidebar } from "./use-sidebar";
import { useCaptureDialog } from "./use-capture-dialog";
import { useGlobalShortcuts } from "./use-global-shortcuts";
import { useLockVaultOnLeave, usePasteToSave } from "./use-shell-effects";
import { DesktopSidebar } from "./desktop-sidebar";
import { Topbar } from "./topbar";
import { MobileNavigation } from "./mobile-nav";
import { CaptureDialog } from "./capture-dialog";
import { FloatingDock } from "./floating-dock";
import { SidebarFlyout } from "./sidebar-flyout";
import { CommandPalette } from "./command-palette";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { LivePopups } from "./live-popups";

/** Everything around a page in the signed-in app: sidebar, topbar, phone bar, and the dialogs and shortcuts that work on any page. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const { collections, create } = useMemories();
  const memoryLimit = usePlanLimit("memory_count");
  const storageLimit = usePlanLimit("storage_mb");

  useLockVaultOnLeave(pathname);
  // So event detection reads "3 pm" in the user's own time zone.
  useSyncTimeZone();

  const sidebar = useSidebar();
  const capture = useCaptureDialog({ create, memoryLimit, storageLimit });
  const { openCaptureModal } = capture;

  // Modals
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const listKeysDialog = useMemoryListKeys();
  usePasteToSave();
  useGlobalShortcuts({
    pathname,
    router,
    saveModalOpen: capture.saveModalOpen,
    saveStep: capture.saveStep,
    captureFormRef: capture.captureFormRef,
    openCaptureModal,
    toggleSidebar: sidebar.toggleSidebar,
    openSearch: () => setSearchModalOpen(true),
    openShortcuts: () => setShortcutsOpen(true),
  });

  const unreadCount = useUnreadCountQuery().data?.count ?? 0;
  const inboxUnread = useInboxCountQuery().data?.unread ?? 0;
  const nav = buildNav({ inboxUnread, unreadCount });

  return (
    <NextStepProvider>
      <NextStep steps={productTourSteps} navigationAdapter={useNextAdapter} cardComponent={TourCard}>
        <TourAutoStart userId={currentUser.id} />
        <AccentColor />
        <div className="flex h-dvh w-screen bg-background text-foreground font-sans overflow-hidden transition-colors duration-300">

      {/* Ambient primary-color glow — decorative, sits behind everything else */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* A soft light from the top of the page, fading down: barely there in
            the light theme, a little more in the dark one. */}
        <div className="absolute inset-0 bg-[radial-gradient(130%_70%_at_50%_-10%,color-mix(in_oklch,var(--foreground)_2.5%,transparent),transparent_70%)] dark:bg-[radial-gradient(130%_70%_at_50%_-10%,color-mix(in_oklch,var(--foreground)_6%,transparent),transparent_70%)]" />
        <div className="absolute -top-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-[110px] animate-ambient-flash" />
        <div className="absolute -bottom-48 -right-24 h-[30rem] w-[30rem] rounded-full bg-primary/[0.07] blur-[130px] animate-ambient-flash [animation-delay:-9s]" />
      </div>

      {/* 1. DESKTOP SIDEBAR */}
      <DesktopSidebar
        sidebar={sidebar}
        nav={nav}
        collections={collections}
        memoryLimit={memoryLimit}
        openCaptureModal={openCaptureModal}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      {/* 2. TOPBAR AND MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">

        <Topbar sidebarCollapsed={sidebar.collapsed} toggleSidebar={sidebar.toggleSidebar} openSearch={() => setSearchModalOpen(true)} unreadCount={unreadCount} />

        {/* Main nested content render */}
        <main className="flex-1 min-h-0">
          <PullToRefresh />
          <ScrollArea className="h-full" viewportClassName="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            <SidebarStateProvider value={{ collapsed: sidebar.collapsed, fullyCollapsed: sidebar.fullyCollapsed }}>
              <SetupPanel />
              {children}
            </SidebarStateProvider>
          </ScrollArea>
        </main>

        <MobileNavigation nav={nav} collections={collections} unreadCount={unreadCount} memoryLimit={memoryLimit} openCaptureModal={openCaptureModal} />

      </div>

      <CaptureDialog capture={capture} collections={collections} memoryLimit={memoryLimit} />

      <FloatingDock sidebar={sidebar} memoryLimit={memoryLimit} openCaptureModal={openCaptureModal} />

      <SidebarFlyout sidebar={sidebar} nav={nav} />

      {/* GLOBAL SEARCH COMMAND PALETTE (⌘K) */}
      <CommandPalette
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        nav={nav}
        openCaptureModal={openCaptureModal}
        toggleSidebar={sidebar.toggleSidebar}
        openShortcuts={() => setShortcutsOpen(true)}
      />

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <LivePopups />
      <DuplicateAskHost />

      <AskWidget />
      <ExtensionInstallPrompt />
      <UpgradeDialog />
      <DropToSave />
      {listKeysDialog}

      {/* Global CSS animations styles */}
      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-up {
          animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes ambientFlash {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .animate-ambient-flash {
          animation: ambientFlash 18s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-ambient-flash {
            animation: none;
          }
        }
      `}</style>

        </div>
      </NextStep>
    </NextStepProvider>
  );
}
