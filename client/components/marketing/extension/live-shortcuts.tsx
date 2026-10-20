"use client";

import { ShortcutKeys, shortcutTokens, usePlatform, usePressedKeys } from "@/components/arc/shortcut-recorder/shortcut-recorder";
import { cn } from "@/lib/utils";

/** The extension's default shortcuts (extension/public/manifest.json, plus Alt+H in the content script). */
const SHORTCUTS = [
  { label: "Save the page", shortcut: "mod+shift+s" },
  { label: "Open the side panel", shortcut: "mod+shift+e" },
  { label: "Highlight the selection", shortcut: "alt+h" },
];

/**
 * The shortcuts as key caps for the viewer's own keyboard (⌘ and ⌥ on a Mac).
 * Keys light up while they're held on this page, and a row lights when its
 * whole combination is down, so people can try them before installing.
 */
export function LiveShortcuts() {
  const platform = usePlatform();
  const pressed = usePressedKeys();
  return (
    <dl className="w-full max-w-sm divide-y divide-foreground/[0.07] rounded-xl bg-card ring-1 ring-foreground/[0.08]">
      {SHORTCUTS.map(({ label, shortcut }) => {
        const held = shortcutTokens(shortcut, platform).every((token) => pressed.has(token.id));
        return (
          <div key={shortcut} className={cn("flex items-center justify-between gap-4 px-4 py-3 transition-colors duration-150", held && "bg-primary/[0.07]")}>
            <dt className={cn("text-sm transition-colors", held ? "text-foreground" : "text-muted-foreground")}>{label}</dt>
            <dd>
              <ShortcutKeys shortcut={shortcut} pressed={pressed} size="sm" />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
