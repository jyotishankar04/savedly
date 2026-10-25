"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Sidebar collapse is a 3-stage sequence rather than one simultaneous
// toggle: the Quick Capture button morphs into a circle first (still
// docked, sidebar unchanged), then the sidebar hides, then the circle
// slides out to its floating dock below the menu button. Expanding runs
// the same sequence in reverse. Each named phase drives both the aside's
// width and which Quick Capture button variant is mounted; transitions
// between phases are chained off animation-completion callbacks so the
// stages never overlap.
export type SidebarPhase = "expanded" | "toCircle" | "hiding" | "collapsed" | "showing" | "toDock";

export function useSidebar() {
  const [sidebarPhase, setSidebarPhase] = useState<SidebarPhase>("expanded");
  const sidebarCollapsed = sidebarPhase === "hiding" || sidebarPhase === "collapsed";
  const sidebarFullyCollapsed = sidebarPhase === "collapsed";
  const [sidebarFlyoutOpen, setSidebarFlyoutOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });
  const flyoutItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  // Set by the Ctrl+M handler when it has to collapse the sidebar first —
  // the phase-watching effect below opens the flyout once collapse finishes.
  const openFlyoutAfterCollapseRef = useRef(false);

  const toggleFlyout = useCallback(() => {
    setSidebarFlyoutOpen((open) => {
      if (!open && menuButtonRef.current) {
        const rect = menuButtonRef.current.getBoundingClientRect();
        setMenuAnchor({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
      return !open;
    });
  }, []);

  const toggleSidebar = () => {
    setSidebarPhase((phase) => {
      if (phase === "expanded") return "toCircle";
      if (phase === "collapsed") return "showing";
      return phase;
    });
  };

  // Collapsed-sidebar quick-nav menu keyboard control: Ctrl+M opens/closes
  // it, Tab / Shift+Tab cycle its items, Escape closes it (Enter navigates
  // via the focused link's own native behavior). If the full sidebar is
  // still open, Ctrl+M collapses it first — the flyout doesn't exist until
  // the sidebar is fully collapsed, so it opens once that finishes (see the
  // phase-watching effect below) rather than being a no-op.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        if (sidebarFullyCollapsed) {
          toggleFlyout();
        } else if (sidebarPhase === "expanded") {
          openFlyoutAfterCollapseRef.current = true;
          toggleSidebar();
        }
        return;
      }

      if (!sidebarFullyCollapsed || !sidebarFlyoutOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setSidebarFlyoutOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (e.key === "Tab") {
        const items = flyoutItemRefs.current.filter((el): el is HTMLAnchorElement => el !== null);
        if (items.length === 0) return;
        e.preventDefault();
        const currentIndex = items.indexOf(document.activeElement as HTMLAnchorElement);
        const delta = e.shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + delta + items.length) % items.length;
        items[nextIndex]?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarFullyCollapsed, sidebarFlyoutOpen, sidebarPhase, toggleFlyout, toggleSidebar]);

  // Once a Ctrl+M-triggered collapse finishes, open the flyout it was
  // waiting on.
  useEffect(() => {
    if (sidebarFullyCollapsed && openFlyoutAfterCollapseRef.current) {
      openFlyoutAfterCollapseRef.current = false;
      toggleFlyout();
    }
  }, [sidebarFullyCollapsed, toggleFlyout]);

  // Focus the first item as soon as the menu opens, so Tab/Shift+Tab have
  // somewhere to start cycling from.
  useEffect(() => {
    if (sidebarFlyoutOpen && sidebarFullyCollapsed) {
      flyoutItemRefs.current[0]?.focus();
    }
  }, [sidebarFlyoutOpen, sidebarFullyCollapsed]);

  return {
    phase: sidebarPhase,
    setPhase: setSidebarPhase,
    collapsed: sidebarCollapsed,
    fullyCollapsed: sidebarFullyCollapsed,
    flyoutOpen: sidebarFlyoutOpen,
    setFlyoutOpen: setSidebarFlyoutOpen,
    menuButtonRef,
    menuAnchor,
    flyoutItemRefs,
    toggleFlyout,
    toggleSidebar,
  };
}

export type SidebarController = ReturnType<typeof useSidebar>;
