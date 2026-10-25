"use client";

import React from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ShortcutList, type ShortcutListGroup } from "@/components/arc/shortcut-recorder/shortcut-recorder";

// What the shortcuts dialog lists. "mod" is ⌘ on a Mac and Ctrl elsewhere;
// the dialog draws the right one for whoever is looking. The keys themselves
// are handled in use-global-shortcuts.ts and use-sidebar.ts.
const KEYBOARD_SHORTCUTS: ShortcutListGroup[] = [
  {
    label: "Anywhere",
    items: [
      { label: "Open search", shortcut: "mod+k", keywords: "find command palette" },
      { label: "Quick capture", shortcut: "mod+q", keywords: "save new add memory" },
      { label: "Save what you copied (outside a text box)", shortcut: "mod+v", keywords: "paste link screenshot note clipboard" },
      { label: "Show keyboard shortcuts", shortcut: "mod+/", keywords: "help keys" },
      { label: "Close an open menu", shortcut: "escape", keywords: "esc dismiss cancel" },
    ],
  },
  {
    label: "In a list of memories",
    items: [
      { label: "Next or previous memory", shortcut: "j", keywords: "down up arrow move k" },
      { label: "Open it", shortcut: "enter", keywords: "view" },
      { label: "Select it", shortcut: "x", keywords: "check pick" },
      { label: "Favorite or unfavorite", shortcut: "f", keywords: "star" },
      { label: "Archive, or take out of the archive", shortcut: "e", keywords: "done" },
      { label: "Move to Trash", shortcut: "delete", keywords: "remove # hash" },
      { label: "Mark as read or unread", shortcut: "m", keywords: "inbox done unread" },
      { label: "Remind me", shortcut: "r", keywords: "snooze later reminder" },
    ],
  },
  {
    label: "Sidebar",
    items: [
      { label: "Show or hide the sidebar", shortcut: "mod+b", keywords: "toggle collapse" },
      { label: "Open the sidebar menu", shortcut: "mod+m", keywords: "navigation collapsed" },
    ],
  },
  {
    label: "Go to",
    items: [
      { label: "Notifications", shortcut: "mod+n", keywords: "alerts inbox" },
      { label: "Settings", shortcut: "mod+p", keywords: "preferences account" },
    ],
  },
  {
    label: "On Ask Savedly",
    items: [
      { label: "New chat", shortcut: "mod+j", keywords: "conversation ask" },
      { label: "Chat history", shortcut: "mod+h", keywords: "past conversations threads" },
    ],
  },
];

/** KEYBOARD SHORTCUTS DIALOG */
export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Keyboard shortcuts"
        description="Search for one, or hold a key to see what it does."
        className="sm:max-w-xl"
      >
        {/* Arc's cheatsheet: searchable, grouped, keys drawn for this person's
            platform. On a desktop the list scrolls inside the dialog on a short screen. */}
        <div className="md:-mx-1 md:max-h-[min(60vh,28rem)] md:overflow-y-auto md:px-1">
          <ShortcutList groups={KEYBOARD_SHORTCUTS} />
        </div>
      </ResponsiveDialog>
  );
}
