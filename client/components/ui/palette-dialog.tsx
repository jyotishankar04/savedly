"use client"

import { useRef, type ComponentProps } from "react"

import { CommandPalette, type CommandItem } from "@/components/arc/command-palette/command-palette"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

/**
 * Arc's command palette in the app's dialog: type to filter a list, arrow
 * keys to move, Enter to choose. Used for the Ctrl/⌘+K palette and for Ask's
 * chat history.
 *
 * The palette draws its own panel, so the dialog around it has no surface of
 * its own. It sits near the top of the window, so it doesn't jump as the
 * results filter, and stays there on a phone too. Escape clears what was
 * typed first and closes on the second press. Arc's built-in "⌘ K" hint is
 * hidden: it is wrong off a Mac, and the palette is already open.
 */
export function PaletteDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  onSelect,
  placeholder,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Read to screen readers; also the search box's label. */
  title: string
  description: string
  items: CommandItem[]
  /** Called with the chosen item. The dialog has already closed. */
  onSelect: (item: CommandItem) => void
  placeholder?: ComponentProps<typeof CommandPalette>["placeholder"]
}) {
  const content = useRef<HTMLDivElement>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        const typed = content.current?.querySelector<HTMLInputElement>('[role="combobox"]')?.value
        if (!next && details?.reason === "escape-key" && typed) return
        onOpenChange(next)
      }}
    >
      <DialogContent
        ref={content}
        showCloseButton={false}
        mobileSheet={false}
        className="top-[12vh] translate-y-0 gap-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-xl [&_[role=combobox]~kbd]:!hidden"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <CommandPalette
          autoFocus
          items={items}
          placeholder={placeholder}
          label={title}
          onSelect={(item) => {
            onOpenChange(false)
            onSelect(item)
          }}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

export type { CommandItem as PaletteItem }
