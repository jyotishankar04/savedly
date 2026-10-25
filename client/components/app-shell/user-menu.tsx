"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon as Settings, HelpCircleIcon as HelpCircle, ChevronDownIcon as ChevronDown, KeyboardIcon as Keyboard } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { UserAvatar, useUser } from "@/context/UserContext";
import { usePlanLabel } from "@/hooks/use-plan-limit";
import { UpgradeCard, UpgradeRing } from "@/components/upgrade-card";
import { useLogout } from "./use-logout";

const PROFILE_MENU_ITEM =
  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none";

/** Sidebar Bottom user profile */
export function UserMenu({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const { user: currentUser } = useUser();
  const planLabel = usePlanLabel();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const logoutAndLeave = useLogout();
  const handleLogout = () => logoutAndLeave(() => setUserDropdownOpen(false));

  return (
        <div className="relative w-60 border-t border-border/40 p-3">
          <UpgradeCard className="mb-2.5" />
          <UpgradeRing>
            <button
              type="button"
              onClick={() => setUserDropdownOpen((open) => !open)}
              aria-expanded={userDropdownOpen}
              aria-haspopup="menu"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted/70",
                userDropdownOpen && "bg-muted/70"
              )}
            >
              <UserAvatar user={currentUser} className="h-8 w-8 shrink-0 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{currentUser.name ?? currentUser.email}</p>
                <p className="truncate text-[11px] text-muted-foreground">{planLabel.label} plan</p>
              </div>
              <HugeiconsIcon icon={ChevronDown} strokeWidth={2} className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200", userDropdownOpen && "rotate-180")} />
            </button>
          </UpgradeRing>

          {userDropdownOpen && (
            <>
              <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setUserDropdownOpen(false)} className="fixed inset-0 z-40 cursor-default" />
              <div role="menu" className="absolute inset-x-3 bottom-[4.25rem] z-50 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-xl">
                <div className="px-2.5 py-2">
                  <p className="truncate text-[13px] font-medium">{currentUser.name ?? currentUser.email}</p>
                  {currentUser.name && <p className="truncate text-[11px] text-muted-foreground">{currentUser.email}</p>}
                </div>
                <div className="my-1 h-px bg-border/60" />
                <Link href="/app/settings" role="menuitem" onClick={() => setUserDropdownOpen(false)} className={PROFILE_MENU_ITEM}>
                  <HugeiconsIcon icon={Settings} strokeWidth={2} className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Link>
                <button type="button" role="menuitem" onClick={() => { setUserDropdownOpen(false); onShowShortcuts(); }} className={PROFILE_MENU_ITEM}>
                  <HugeiconsIcon icon={Keyboard} strokeWidth={2} className="h-4 w-4 text-muted-foreground" />
                  Keyboard shortcuts
                </button>
                <Link href="/help" target="_blank" rel="noreferrer" role="menuitem" onClick={() => setUserDropdownOpen(false)} className={PROFILE_MENU_ITEM}>
                  <HugeiconsIcon icon={HelpCircle} strokeWidth={2} className="h-4 w-4 text-muted-foreground" />
                  Help Center
                </Link>
                <div className="my-1 h-px bg-border/60" />
                <button type="button" role="menuitem" onClick={handleLogout} className={cn(PROFILE_MENU_ITEM, "text-destructive hover:bg-destructive/10 hover:text-destructive")}>
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
  );
}
