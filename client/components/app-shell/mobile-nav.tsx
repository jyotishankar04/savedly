"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusIcon as Plus,
  Search01Icon as Search,
  Settings01Icon as Settings,
  HelpCircleIcon as HelpCircle,
  CompassIcon as Compass,
  Menu01Icon as Menu,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types/memory";
import { UserAvatar, useUser } from "@/context/UserContext";
import { usePlanLabel, type usePlanLimit } from "@/hooks/use-plan-limit";
import { LimitDot } from "@/components/plan-limit-notice";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { LogoMark } from "@/components/logo";
import { UpgradeBadge, UpgradeCard } from "@/components/upgrade-card";
import { COLLECTIONS_PREVIEW_COUNT, isNavItemActive, type AppNav, type NavItem } from "./nav";
import { useLogout } from "./use-logout";

// The phone menu's rows: taller than the sidebar's, for a thumb.
const MOBILE_MENU_ROW =
  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

function MobileMenuLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(MOBILE_MENU_ROW, active ? "bg-sidebar-accent text-foreground" : "text-foreground active:bg-muted")}
    >
      {item.logo ? (
        <LogoMark ticks={false} className="h-5 w-5 shrink-0" />
      ) : (
        <HugeiconsIcon icon={item.icon} strokeWidth={2} className={cn("h-5 w-5 shrink-0", active ? "text-foreground" : "text-muted-foreground")} />
      )}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums">{item.badge > 99 ? "99+" : item.badge}</span>
      ) : null}
    </Link>
  );
}

/** The phone's bottom bar, and the menu it opens: everything the sidebar holds, plus the account actions. */
export function MobileNavigation({
  nav,
  collections,
  unreadCount,
  memoryLimit,
  openCaptureModal,
}: {
  nav: AppNav;
  collections: Collection[];
  unreadCount: number;
  memoryLimit: ReturnType<typeof usePlanLimit>;
  openCaptureModal: () => void;
}) {
  const pathname = usePathname();
  const { user: currentUser } = useUser();
  const planLabel = usePlanLabel();
  const logoutAndLeave = useLogout();
  const { primaryNavItems, navSections } = nav;
  // The phone-width stand-in for the sidebar, opened from the bottom bar.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
        {/* 3. MOBILE BOTTOM NAVIGATION BAR */}
        <nav aria-label="Primary" className="fixed bottom-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-card border-t border-border flex items-center justify-around z-40 md:hidden px-4">
          <Link href="/app" className={cn("flex flex-col items-center gap-0.5 text-[9px] font-bold", isNavItemActive(pathname, "/app") ? "text-primary" : "text-muted-foreground")}>
            <HugeiconsIcon icon={Compass} strokeWidth={2.25} className="h-5 w-5" />
            <span>Home</span>
          </Link>

          <Link href="/app/search" className={cn("flex flex-col items-center gap-0.5 text-[9px] font-bold", isNavItemActive(pathname, "/app/search") ? "text-primary" : "text-muted-foreground")}>
            <HugeiconsIcon icon={Search} strokeWidth={2.25} className="h-5 w-5" />
            <span>Search</span>
          </Link>

          {/* Quick Capture Button (Prominent!) */}
          <button
            onClick={() => openCaptureModal()}
            title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
            className="relative h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg -translate-y-2 select-none"
          >
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-6 w-6 stroke-[2.5]" />
            {memoryLimit.isAtLimit && <LimitDot />}
          </button>

          <Link href="/app/ask" className={cn("flex flex-col items-center gap-0.5 text-[9px] font-bold", isNavItemActive(pathname, "/app/ask") ? "text-primary" : "text-muted-foreground")}>
            <LogoMark ticks={false} className="h-5 w-5" />
            <span>Ask</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={mobileMenuOpen}
            className={cn("relative flex flex-col items-center gap-0.5 text-[9px] font-bold", mobileMenuOpen ? "text-primary" : "text-muted-foreground")}
          >
            <HugeiconsIcon icon={Menu} strokeWidth={2.25} className="h-5 w-5" />
            <span>Menu</span>
            {unreadCount > 0 && <span aria-hidden className="absolute -top-0.5 right-0 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />}
          </button>
        </nav>

        {/* 4. MOBILE MENU: everything the sidebar holds, plus the account actions */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[86vw] max-w-sm gap-0 p-0 md:hidden">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Every section of Savedly, your collections and your account.</SheetDescription>

            <div className="flex items-center gap-3 border-b border-border/40 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
              <UserAvatar user={currentUser} className="h-10 w-10 shrink-0 text-sm" />
              <div className="min-w-0 flex-1 pr-8">
                <p className="truncate text-sm font-medium text-foreground">{currentUser.name ?? currentUser.email}</p>
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs text-muted-foreground">{planLabel.label} plan</p>
                  <UpgradeBadge />
                </div>
              </div>
            </div>

            <nav aria-label="All sections" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
              {/* At the top of the list, so it scrolls away rather than squeezing the sections. */}
              <UpgradeCard onNavigate={() => setMobileMenuOpen(false)} />
              <div className="space-y-0.5">
                {primaryNavItems.map((item) => (
                  <MobileMenuLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} onNavigate={() => setMobileMenuOpen(false)} />
                ))}
              </div>

              {navSections.map((section) => (
                <div key={section.id} className="space-y-0.5">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{section.label}</p>
                  {section.items.map((item) => (
                    <MobileMenuLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} onNavigate={() => setMobileMenuOpen(false)} />
                  ))}
                </div>
              ))}

              {collections.length > 0 && (
                <div className="space-y-0.5">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Collections</p>
                  {collections.slice(0, COLLECTIONS_PREVIEW_COUNT).map((col) => {
                    const href = `/app/collections/${col.id}`;
                    const active = isNavItemActive(pathname, href);
                    return (
                      <Link
                        key={col.id}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(MOBILE_MENU_ROW, active ? "bg-sidebar-accent text-foreground" : "text-foreground active:bg-muted")}
                      >
                        <span aria-hidden className="flex w-5 shrink-0 justify-center text-base leading-none">{col.icon}</span>
                        <span className="min-w-0 flex-1 truncate">{col.name}</span>
                        {col.memoryCount > 0 && <span className="text-xs tabular-nums text-muted-foreground">{col.memoryCount}</span>}
                      </Link>
                    );
                  })}
                  {collections.length > COLLECTIONS_PREVIEW_COUNT && (
                    <Link href="/app/collections" onClick={() => setMobileMenuOpen(false)} className={cn(MOBILE_MENU_ROW, "text-muted-foreground active:bg-muted")}>
                      <span className="w-5 shrink-0" />
                      All {collections.length} collections
                    </Link>
                  )}
                </div>
              )}
            </nav>

            <div className="space-y-0.5 border-t border-border/40 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <MobileMenuLink item={{ label: "Settings", href: "/app/settings", icon: Settings }} active={isNavItemActive(pathname, "/app/settings")} onNavigate={() => setMobileMenuOpen(false)} />
              <Link href="/help" onClick={() => setMobileMenuOpen(false)} className={cn(MOBILE_MENU_ROW, "text-foreground active:bg-muted")}>
                <HugeiconsIcon icon={HelpCircle} strokeWidth={2} className="h-5 w-5 shrink-0 text-muted-foreground" />
                Help Center
              </Link>
              <button type="button" onClick={() => { setMobileMenuOpen(false); logoutAndLeave(); }} className={cn(MOBILE_MENU_ROW, "w-full text-left text-destructive active:bg-destructive/10")}>
                <span className="w-5 shrink-0" />
                Log out
              </button>
            </div>
          </SheetContent>
        </Sheet>
    </>
  );
}
