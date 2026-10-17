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

/**
 * Props for a selectable card's root. While something is selected, a click
 * anywhere on the card toggles it (Shift extends the range) instead of opening
 * it; on a touch screen a long press starts selecting.
 */
export function selectableProps(selecting: boolean, onSelect: ((event: { shiftKey?: boolean }) => void) | undefined) {
  if (!onSelect) return {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  let longPressed = false;
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return {
    onClickCapture: (event: React.MouseEvent) => {
      if (longPressed) {
        longPressed = false;
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
      longPressed = false;
      timer = setTimeout(() => {
        longPressed = true;
        onSelect({});
        navigator.vibrate?.(10);
      }, LONG_PRESS_MS);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event: React.MouseEvent) => {
      if (longPressed) event.preventDefault();
    },
  };
}
