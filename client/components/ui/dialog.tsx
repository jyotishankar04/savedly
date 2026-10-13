"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react";
import { XIcon } from "@hugeicons/core-free-icons";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/80 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

// On a phone every dialog is a bottom sheet: full width, rising from the
// bottom edge with rounded top corners, scrolling inside itself, and able to
// be dragged down by its grabber to close. It is the same dialog underneath,
// only placed and animated differently below the `md` breakpoint, so menus,
// selects and popovers inside it keep working. The look follows Arc UI's
// bottom sheet. These win over a caller's own position and width classes.
const MOBILE_SHEET =
  "max-md:!top-auto max-md:!bottom-0 max-md:!left-0 max-md:!w-full max-md:!max-w-none max-md:!translate-x-0 max-md:!translate-y-0 " +
  "max-md:!rounded-t-[1.75rem] max-md:!rounded-b-none max-md:max-h-[92dvh] max-md:overflow-y-auto max-md:overscroll-contain " +
  "max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:shadow-[0_-12px_40px_rgb(0_0_0/0.18)] " +
  "max-md:duration-300 max-md:ease-[cubic-bezier(.22,1,.36,1)] max-md:data-open:slide-in-from-bottom max-md:data-open:zoom-in-100 " +
  "max-md:data-closed:slide-out-to-bottom max-md:data-closed:zoom-out-100 max-md:data-closed:duration-200"

/** How far (px) or how fast (px/ms) the sheet must be dragged down to close. */
const DISMISS_DISTANCE = 110
const DISMISS_SPEED = 0.55

/**
 * The bar at the top of a phone's sheet. Dragging it down moves the sheet
 * with the finger; let go past the threshold (or flick) and it closes,
 * otherwise it springs back. Hidden from `md` up.
 */
function SheetGrabber() {
  const close = React.useRef<HTMLButtonElement>(null)
  const drag = React.useRef<{ y: number; t: number } | null>(null)

  const sheetOf = (el: HTMLElement) => el.closest<HTMLElement>("[data-mobile-sheet]")

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, t: e.timeStamp }
    const sheet = sheetOf(e.currentTarget)
    if (sheet) sheet.style.transition = "none"
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const sheet = sheetOf(e.currentTarget)
    if (!d || !sheet) return
    // Pulling up past the resting place gives a little, then resists.
    const dy = e.clientY - d.y
    sheet.style.translate = `0 ${dy > 0 ? dy : dy / 6}px`
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const sheet = sheetOf(e.currentTarget)
    drag.current = null
    if (!d || !sheet) return
    const dy = e.clientY - d.y
    const speed = dy / Math.max(1, e.timeStamp - d.t)
    if (dy > DISMISS_DISTANCE || (dy > 30 && speed > DISMISS_SPEED)) {
      // Closes through the dialog itself, so focus returns and the exit animation runs.
      close.current?.click()
      return
    }
    sheet.style.transition = "translate 260ms cubic-bezier(.22,1,.36,1)"
    sheet.style.translate = "0 0"
  }

  return (
    <div
      data-slot="dialog-grabber"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute inset-x-0 top-0 z-10 flex h-7 cursor-grab touch-none items-center justify-center active:cursor-grabbing md:hidden"
    >
      <span aria-hidden className="h-[5px] w-9 rounded-full bg-foreground/20" />
      <DialogPrimitive.Close ref={close} tabIndex={-1} aria-hidden className="hidden" />
    </div>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  mobileSheet = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  /** On a phone, show as a bottom sheet (the default). Off for the few dialogs that draw their own surface. */
  mobileSheet?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-mobile-sheet={mobileSheet ? "" : undefined}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
          // Room at the top for the grabber.
          mobileSheet && MOBILE_SHEET,
          mobileSheet && "max-md:!pt-7",
        )}
        {...props}
      >
        {mobileSheet && <SheetGrabber />}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2 max-md:top-5 max-md:right-3"
                size="icon-sm"
              />
            }
          >
            <HugeiconsIcon icon={XIcon} strokeWidth={2.25}
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-xs/relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  MOBILE_SHEET,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
