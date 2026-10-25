"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusIcon as Plus, ChevronDownIcon as ChevronDown } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types/memory";
import type { usePlanLimit } from "@/hooks/use-plan-limit";
import { LimitDot } from "@/components/plan-limit-notice";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlidingHighlight } from "@/components/ui/gliding-highlight";
import { Logo } from "@/components/logo";
import { useMemoryDragging } from "@/components/memory/collection-drop";
import { COLLECTIONS_PREVIEW_COUNT, SHELF_HREFS, isNavItemActive, type AppNav, type NavSection } from "./nav";
import { SidebarCollectionRow, SidebarLink, SidebarSection, SidebarShelfLink } from "./sidebar-links";
import type { SidebarController } from "./use-sidebar";
import { UserMenu } from "./user-menu";

const CLOSED_SECTIONS_KEY = "sfl:sidebar-closed-sections";

function readClosedSections(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CLOSED_SECTIONS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** DESKTOP SIDEBAR */
export function DesktopSidebar({
  sidebar,
  nav,
  collections,
  memoryLimit,
  openCaptureModal,
  onShowShortcuts,
}: {
  sidebar: SidebarController;
  nav: AppNav;
  collections: Collection[];
  memoryLimit: ReturnType<typeof usePlanLimit>;
  openCaptureModal: () => void;
  onShowShortcuts: () => void;
}) {
  const pathname = usePathname();
  const { primaryNavItems, navSections } = nav;
  const { phase: sidebarPhase, setPhase: setSidebarPhase, collapsed: sidebarCollapsed } = sidebar;

  // Which sidebar sections the user folded away, remembered across visits.
  const [closedSections, setClosedSections] = useState<string[]>(readClosedSections);
  const toggleSection = (id: string) => {
    setClosedSections((closed) => {
      const next = closed.includes(id) ? closed.filter((s) => s !== id) : [...closed, id];
      try {
        localStorage.setItem(CLOSED_SECTIONS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const [collectionsShowAll, setCollectionsShowAll] = useState(false);
  // While memories are dragged, every collection (and Favorites, Archive, Vault, Trash) is a place to drop them: show them all, with their sections open.
  const dragging = useMemoryDragging();
  const renderSection = (section: NavSection) => (
    <SidebarSection
      key={section.id}
      label={section.label}
      // A section with places to drop memories opens while they're dragged.
      open={(dragging && section.items.some((item) => SHELF_HREFS[item.href])) || !closedSections.includes(section.id)}
      onToggle={() => toggleSection(section.id)}
    >
      {section.items.map((item) =>
        SHELF_HREFS[item.href] ? (
          <SidebarShelfLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} shelf={SHELF_HREFS[item.href]!} dragging={dragging} />
        ) : (
          <SidebarLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} />
        ),
      )}
    </SidebarSection>
  );
  const visibleCollections = collectionsShowAll || dragging ? collections : collections.slice(0, COLLECTIONS_PREVIEW_COUNT);

  return (
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 0 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        onAnimationComplete={() => {
          setSidebarPhase((phase) => {
            if (phase === "hiding") return "collapsed";
            if (phase === "showing") return "toDock";
            return phase;
          });
        }}
        className={cn(
          "relative z-10 bg-sidebar flex flex-col justify-between shrink-0 hidden md:flex overflow-hidden",
          sidebarCollapsed ? "border-r-0" : "border-r border-border/60"
        )}
      >
        <div className="flex flex-col min-h-0 flex-1 w-60">

          {/* Header + Quick Capture — fixed, never scrolls with the nav below */}
          <div className="px-3 pt-5 pb-3 space-y-4 shrink-0">
            <Link href="/app" className="flex items-center gap-2 px-3 hover:opacity-85 transition-opacity">
              <Logo className="text-[15px]" />
            </Link>

            {sidebarPhase === "expanded" && (
              <motion.button
                layoutId="quick-capture-fab"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                onClick={() => openCaptureModal()}
                data-tour="quick-capture-btn"
                title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
                className="relative w-full h-10 rounded-full font-semibold text-[13px] bg-primary text-primary-foreground flex items-center justify-center gap-1.5 shadow-sm"
              >
                <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" /> Quick Capture
                {memoryLimit.isAtLimit && <LimitDot />}
              </motion.button>
            )}

            {/* Stage 1 (collapsing): morphs from the pill above into this
                docked circle before the sidebar starts hiding. Stage 3
                (expanding): this is where the floating circle slides back
                to before morphing into the pill again. */}
            {(sidebarPhase === "toCircle" || sidebarPhase === "hiding" || sidebarPhase === "toDock") && (
              <motion.button
                layoutId="quick-capture-fab"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                onClick={() => openCaptureModal()}
                onLayoutAnimationComplete={() => {
                  setSidebarPhase((phase) => {
                    if (phase === "toCircle") return "hiding";
                    if (phase === "toDock") return "expanded";
                    return phase;
                  });
                }}
                title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
                className="relative h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0"
                aria-label="Quick Capture (Ctrl+Q)"
              >
                <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" />
                {memoryLimit.isAtLimit && <LimitDot />}
              </motion.button>
            )}
          </div>

        <ScrollArea className="flex-1 min-h-0">
        <GlidingHighlight aria-label="Main" className="px-3 pb-5 space-y-5">

          <div className="space-y-0.5">
            {primaryNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isNavItemActive(pathname, item.href)}
                data-tour={item.href === "/app/memories" ? "nav-memories" : undefined}
              />
            ))}
          </div>

          {navSections.slice(0, 1).map(renderSection)}

          <SidebarSection
            label="Collections"
            open={dragging || !closedSections.includes("collections")}
            onToggle={() => toggleSection("collections")}
            action={
              <Link
                href="/app/collections"
                aria-label="New collection"
                title="New collection"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={Plus} strokeWidth={2} className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {collections.length === 0 ? (
              <p className="px-3 py-1.5 text-[13px] leading-snug text-muted-foreground">
                Group related saves.{" "}
                <Link href="/app/collections" className="font-medium text-primary hover:underline">Create one</Link>
              </p>
            ) : (
              <>
                {visibleCollections.map((col) => (
                  <SidebarCollectionRow key={col.id} collection={col} active={isNavItemActive(pathname, `/app/collections/${col.id}`)} dragging={dragging} />
                ))}
                {collections.length > COLLECTIONS_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setCollectionsShowAll((show) => !show)}
                    data-nav-row=""
                    className="relative z-[1] flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="flex w-[18px] justify-center">
                      <HugeiconsIcon icon={ChevronDown} strokeWidth={2} className={cn("h-3.5 w-3.5 transition-transform duration-200", collectionsShowAll && "rotate-180")} />
                    </span>
                    {collectionsShowAll ? "Show less" : `${collections.length - COLLECTIONS_PREVIEW_COUNT} more`}
                  </button>
                )}
              </>
            )}
          </SidebarSection>

          {navSections.slice(1).map(renderSection)}

        </GlidingHighlight>
        </ScrollArea>

        </div>

        <UserMenu onShowShortcuts={onShowShortcuts} />

      </motion.aside>
  );
}
