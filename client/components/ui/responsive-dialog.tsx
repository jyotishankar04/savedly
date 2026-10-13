"use client"

import type { ReactNode } from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * A dialog with a titled header and padded content, for the common case.
 * Like every dialog in the app it is a centred box on a desktop and a
 * bottom sheet on a phone; that part is done by DialogContent itself.
 * Pass the content bare: the title and the padding are drawn here.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  hideDescription = false,
  className,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Keeps the description for screen readers only. */
  hideDescription?: boolean
  /** For the dialog's width on a desktop. */
  className?: string
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("gap-0 p-0", className)}>
        <DialogHeader className="border-b border-border/60 px-6 py-4 max-md:px-5 max-md:pt-1">
          <DialogTitle className="text-base font-medium">{title}</DialogTitle>
          {description && <DialogDescription className={cn(hideDescription && "sr-only")}>{description}</DialogDescription>}
        </DialogHeader>
        <div className="px-6 py-5 max-md:px-5">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
