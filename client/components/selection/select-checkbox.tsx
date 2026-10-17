"use client";

import type React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon as Tick } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/**
 * The round check in a card's top-left corner for bulk selection. Shown on
 * hover, and always once anything on the page is selected. Its own click
 * never opens the card.
 */
export function SelectCheckbox({
  checked,
  selecting,
  onToggle,
  label,
  className,
}: {
  checked: boolean;
  selecting: boolean;
  onToggle: (event: React.MouseEvent) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle(event);
      }}
      className={cn(
        "absolute top-2.5 left-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border shadow-xs backdrop-blur-sm transition-[opacity,background-color,border-color,transform] duration-150 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-90",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-foreground/25 bg-card/90 text-transparent hover:border-primary/60",
        checked || selecting ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        className,
      )}
    >
      <HugeiconsIcon icon={Tick} strokeWidth={3} className="h-3.5 w-3.5" />
    </button>
  );
}

const LONG_PRESS_MS = 450;

// Kept outside the props, not in their closure: selecting re-renders the card,
// which hands React new handlers, and the press must still be cancellable,
// and the click that follows a long press still swallowed, across that.
let pressTimer: ReturnType<typeof setTimeout> | null = null;
let swallowClickUntil = 0;

function cancelPress() {
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = null;
}

/**
 * Props for a selectable card's root. While something is selected, a click
 * anywhere on the card toggles it (Shift extends the range) instead of opening
 * it; on a touch screen a long press starts selecting.
 */
export function selectableProps(selecting: boolean, onSelect: ((event: { shiftKey?: boolean }) => void) | undefined) {
  if (!onSelect) return {};
  return {
    onClickCapture: (event: React.MouseEvent) => {
      // The click a touch screen sends when a long press ends.
      if (Date.now() < swallowClickUntil) {
        swallowClickUntil = 0;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!selecting) return;
      event.preventDefault();
      event.stopPropagation();
      onSelect({ shiftKey: event.shiftKey });
    },
    onPointerDown: (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") return;
      cancelPress();
      pressTimer = setTimeout(() => {
        pressTimer = null;
        swallowClickUntil = Date.now() + 800;
        onSelect({});
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS);
    },
    onPointerUp: cancelPress,
    onPointerLeave: cancelPress,
    onPointerCancel: cancelPress,
    onContextMenu: (event: React.MouseEvent) => {
      if (Date.now() < swallowClickUntil) event.preventDefault();
    },
  };
}

/**
 * A list row's leading icon that turns into the selection check: the icon
 * fades while selecting and the round check sits where it was.
 */
export function RowSelect({
  checked,
  selecting,
  onToggle,
  label,
  className,
  children,
}: {
  checked: boolean;
  selecting: boolean;
  onToggle: (event: React.MouseEvent) => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("group/row-select relative", className)}>
      <div className={cn("contents transition-opacity [&>*]:transition-opacity", (selecting || checked) && "[&>*]:opacity-0")}>{children}</div>
      <SelectCheckbox
        checked={checked}
        selecting={selecting}
        onToggle={onToggle}
        label={label}
        className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}
