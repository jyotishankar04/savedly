"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon as Search,
  BellIcon as Bell,
  MoonIcon as Moon,
  Sun01Icon as Sun,
  PanelLeftCloseIcon as PanelLeftClose,
  PanelLeftOpenIcon as PanelLeftOpen,
  ShieldUserIcon as ShieldUser,
} from "@hugeicons/core-free-icons";
import { UserAvatar, useUser } from "@/context/UserContext";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

/** Topbar Header (desktop) */
export function Topbar({
  sidebarCollapsed,
  toggleSidebar,
  openSearch,
  unreadCount,
}: {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  openSearch: () => void;
  unreadCount: number;
}) {
  const { theme, setTheme } = useTheme();
  const { user: currentUser } = useUser();

  return (
        <header className="h-16 border-b border-border/40 px-6 flex items-center justify-between shrink-0 hidden md:flex">

          <div className="flex items-center gap-3">
            {/* Sidebar collapse toggle */}
            <button
              onClick={toggleSidebar}
              data-tour="sidebar-collapse-btn"
              className="h-8 w-8 rounded-full border border-border/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            >
              {sidebarCollapsed ? <HugeiconsIcon icon={PanelLeftOpen} strokeWidth={2.25} className="h-4 w-4" /> : <HugeiconsIcon icon={PanelLeftClose} strokeWidth={2.25} className="h-4 w-4" />}
            </button>

            {/* Global search trigger */}
            <button
              onClick={openSearch}
              className="w-80 h-9 px-3 rounded-full border border-border/60 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between hover:bg-muted transition-all select-none"
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Search} strokeWidth={2.25} className="h-3.5 w-3.5 text-primary" />
                <span>Search your memory...</span>
              </div>
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/app/notifications"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications (Ctrl+N)"}
              className="h-8 w-8 rounded-full border border-border/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
            >
              <HugeiconsIcon icon={Bell} strokeWidth={2.25} className="h-4 w-4" />
              {/* Real now. This used to be a hardcoded dot that was always
                  lit, which made it meaningless as a signal. */}
              {unreadCount > 0 && <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-primary rounded-full" />}
            </Link>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 rounded-full border border-border/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <HugeiconsIcon icon={Sun} strokeWidth={2.25} className="h-4 w-4" /> : <HugeiconsIcon icon={Moon} strokeWidth={2.25} className="h-4 w-4" />}
            </button>

            {currentUser.roles.includes("admin") && (
              <Link
                href="/admin"
                aria-label="Admin panel"
                className="h-8 w-8 rounded-full border border-border/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={ShieldUser} strokeWidth={2.25} className="h-4 w-4" />
              </Link>
            )}

            <Link href="/app/settings" aria-label="Profile (Ctrl+P)">
              <UserAvatar user={currentUser} className="h-8 w-8 text-xs border border-primary/20" />
            </Link>
          </div>

        </header>
  );
}
