"use client";

import React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChevronDownIcon as ChevronDown } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types/memory";
import { LogoMark } from "@/components/logo";
import { type Shelf, useCollectionDrop, useShelfDrop } from "@/components/memory/collection-drop";
import { SHELF_VERB, type NavItem } from "./nav";

const SIDEBAR_ROW =
  "relative z-[1] flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

/**
 * A collection in the sidebar, which memories can also be dragged onto. While
 * a drag is on, every row shows a dashed edge to say it takes drops; the one
 * under the pointer fills with the accent and says Add.
 */
export function SidebarCollectionRow({ collection, active, dragging }: { collection: Collection; active: boolean; dragging: boolean }) {
  const drop = useCollectionDrop(collection);
  return (
    <Link
      href={`/app/collections/${collection.id}`}
      aria-current={active ? "page" : undefined}
      data-nav-row=""
      {...drop.props}
      className={cn(
        SIDEBAR_ROW,
        active ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:text-foreground",
        dragging && "outline-1 -outline-offset-1 outline-dashed outline-foreground/15",
        drop.over && "bg-primary/15 text-primary outline-primary/60",
      )}
    >
      <span aria-hidden className="flex w-[18px] shrink-0 justify-center text-sm leading-none">{collection.icon}</span>
      <span className="min-w-0 flex-1 truncate">{collection.name}</span>
      {drop.over ? (
        <span className="text-[11px] font-semibold text-primary">Add</span>
      ) : (
        collection.memoryCount > 0 && <span className="text-[11px] tabular-nums text-muted-foreground/70">{collection.memoryCount}</span>
      )}
    </Link>
  );
}

export function SidebarLink({ item, active, ...rest }: { item: NavItem; active: boolean; "data-tour"?: string }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      data-nav-row=""
      {...rest}
      className={cn(
        SIDEBAR_ROW,
        // No hover fill of its own: the nav's one highlight glides to it (GlidingHighlight).
        active ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {item.logo ? (
        <LogoMark ticks={false} className="h-[18px] w-[18px]" />
      ) : (
        <HugeiconsIcon icon={item.icon} strokeWidth={2} className="h-[18px] w-[18px] shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-semibold leading-5 tabular-nums text-primary-foreground">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      ) : null}
    </Link>
  );
}

/** Favorites, Vault, Archive or Trash in the sidebar, which also take dropped memories (see SidebarCollectionRow). */
export function SidebarShelfLink({ item, active, shelf, dragging }: { item: NavItem; active: boolean; shelf: Shelf; dragging: boolean }) {
  const drop = useShelfDrop(shelf);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      data-nav-row=""
      {...drop.props}
      className={cn(
        SIDEBAR_ROW,
        active ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:text-foreground",
        dragging && "outline-1 -outline-offset-1 outline-dashed outline-foreground/15",
        drop.over && (shelf === "trash" ? "bg-destructive/12 text-destructive outline-destructive/60" : "bg-primary/15 text-primary outline-primary/60"),
      )}
    >
      <HugeiconsIcon icon={item.icon} strokeWidth={2} className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {drop.over && <span className="text-[11px] font-semibold">{SHELF_VERB[shelf]}</span>}
    </Link>
  );
}

/** A labelled, foldable group of sidebar links. */
export function SidebarSection({
  label,
  open,
  onToggle,
  action,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center pr-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="group flex h-7 flex-1 items-center gap-1 rounded-md px-3 text-[11px] font-medium text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {label}
          <HugeiconsIcon
            icon={ChevronDown}
            strokeWidth={2}
            className={cn(
              "h-3 w-3 transition-all duration-200",
              open ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" : "-rotate-90"
            )}
          />
        </button>
        {action}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
