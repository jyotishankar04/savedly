"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  PlusIcon as Plus,
  Settings01Icon as Settings,
  Note01Icon as NoteIcon,
  FolderPlusIcon as FolderPlus,
  PanelLeftCloseIcon as PanelLeftClose,
  KeyboardIcon as Keyboard,
} from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/logo";
import { PaletteDialog, type PaletteItem } from "@/components/ui/palette-dialog";
import { formatShortcut, usePlatform } from "@/components/arc/shortcut-recorder/shortcut-recorder";
import type { AppNav } from "./nav";

/** The command palette (Ctrl/⌘+K). */
export function CommandPalette({
  open,
  onOpenChange,
  nav,
  openCaptureModal,
  toggleSidebar,
  openShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nav: AppNav;
  openCaptureModal: () => void;
  toggleSidebar: () => void;
  openShortcuts: () => void;
}) {
  const router = useRouter();
  const { primaryNavItems, secondaryNavItems } = nav;
  // What the command palette offers: a few actions, then every page the
  // sidebar links to. `commandActions` holds what each one does, by id.
  const platform = usePlatform();
  const keys = (shortcut: string) => formatShortcut(shortcut, platform).text;
  const paletteIcon = (icon: IconSvgElement) => <HugeiconsIcon icon={icon} strokeWidth={2} className="h-4 w-4" />;
  const pageItems = [...primaryNavItems, ...secondaryNavItems, { label: "Settings", href: "/app/settings", icon: Settings }];
  const commandItems: PaletteItem[] = [
    { id: "capture", group: "Actions", label: "Save something", description: "A link, a note or a file", keywords: ["new", "add", "memory", "capture", "quick"], icon: paletteIcon(Plus), shortcut: keys("mod+q") },
    { id: "new-note", group: "Actions", label: "Write a note", description: "A new note, full page", keywords: ["new", "note", "write", "page", "doc", "editor"], icon: paletteIcon(NoteIcon) },
    { id: "ask", group: "Actions", label: "Ask Savedly", description: "Get an answer from what you saved", keywords: ["chat", "question", "ai"], icon: <LogoMark ticks={false} className="h-4 w-4" /> },
    { id: "new-collection", group: "Actions", label: "New collection", keywords: ["create", "folder", "group"], icon: paletteIcon(FolderPlus) },
    { id: "toggle-sidebar", group: "Actions", label: "Show or hide the sidebar", keywords: ["collapse", "expand", "menu"], icon: paletteIcon(PanelLeftClose), shortcut: keys("mod+b") },
    { id: "shortcuts", group: "Actions", label: "Keyboard shortcuts", keywords: ["keys", "help", "hotkeys"], icon: paletteIcon(Keyboard), shortcut: keys("mod+/") },
    ...pageItems
      // "Ask Savedly" is already an action above.
      .filter((item) => item.href !== "/app/ask")
      .map((item) => ({ id: `go:${item.href}`, group: "Go to", label: item.label, keywords: ["open", "page"], icon: paletteIcon(item.icon) })),
  ];
  const commandActions: Record<string, () => void> = {
    capture: openCaptureModal,
    "new-note": () => router.push("/app/notes/new"),
    ask: () => router.push("/app/ask"),
    "new-collection": () => router.push("/app/collections"),
    "toggle-sidebar": toggleSidebar,
    shortcuts: openShortcuts,
    ...Object.fromEntries(pageItems.map((item) => [`go:${item.href}`, () => router.push(item.href)])),
  };

  return (
      <PaletteDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Search pages and actions"
        description="Type to find a page or an action, then press Enter."
        placeholder="Search or jump to…"
        items={commandItems}
        onSelect={(item) => commandActions[item.id]?.()}
      />
  );
}
