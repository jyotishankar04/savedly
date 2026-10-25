"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { isNavItemActive, type AppNav } from "./nav";
import type { SidebarController } from "./use-sidebar";

/** COLLAPSED SIDEBAR QUICK-NAV FLYOUT — pops off the menu button in a
 * half-circle arc instead of a straight list. */
export function SidebarFlyout({ sidebar, nav }: { sidebar: SidebarController; nav: AppNav }) {
  const pathname = usePathname();
  const { primaryNavItems, secondaryNavItems } = nav;
  const { fullyCollapsed: sidebarFullyCollapsed, flyoutOpen: sidebarFlyoutOpen, setFlyoutOpen: setSidebarFlyoutOpen, menuAnchor, flyoutItemRefs } = sidebar;

  return (
      <AnimatePresence>
        {sidebarFullyCollapsed && sidebarFlyoutOpen && (
          <React.Fragment key="sidebar-flyout">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSidebarFlyoutOpen(false)}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm hidden md:block"
            />
            <div
              className="fixed z-50 hidden md:block"
              style={{ left: menuAnchor.x, top: menuAnchor.y }}
            >
              <TooltipProvider delay={150}>
              {[...primaryNavItems, ...secondaryNavItems].map((item, idx, all) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item.href);
                const itemSize = 48;
                // Radius scales with item count so items keep roughly the
                // same arc-length gap (~52px, the spacing the original fixed
                // radius=150 gave for 10 items) instead of overlapping once
                // more nav items are added — a fixed radius crowded the last
                // few icons into a clump once this list grew past ~10.
                const radius = all.length <= 1 ? 150 : (52 * (all.length - 1)) / Math.PI;
                // Half-circle bulging to the right of the button (-90deg =
                // straight up, 0deg = right, +90deg = straight down), since
                // the dock is pinned to the left edge of the screen.
                const angleDeg = all.length === 1 ? 0 : -90 + (180 / (all.length - 1)) * idx;
                const angleRad = (angleDeg * Math.PI) / 180;
                const targetX = radius * Math.cos(angleRad) - itemSize / 2;
                const targetY = radius * Math.sin(angleRad) - itemSize / 2;
                const originOffset = -itemSize / 2;
                return (
                  <motion.div
                    key={item.href}
                    className="absolute top-0 left-0"
                    initial={{ x: originOffset, y: originOffset, opacity: 0, scale: 0.3 }}
                    animate={{ x: targetX, y: targetY, opacity: 1, scale: 1 }}
                    exit={{ x: originOffset, y: originOffset, opacity: 0, scale: 0.3 }}
                    transition={{ duration: 0.25, delay: idx * 0.02, ease: "easeOut" }}
                  >
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Link
                            ref={(el) => {
                              flyoutItemRefs.current[idx] = el;
                            }}
                            href={item.href}
                            onClick={() => setSidebarFlyoutOpen(false)}
                            aria-label={item.label}
                            style={{ height: itemSize, width: itemSize }}
                            className={cn(
                              "rounded-full border flex items-center justify-center shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                              active
                                ? "bg-primary/15 border-primary/30 text-primary"
                                : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            {item.logo ? <LogoMark ticks={false} className="h-5 w-5" /> : <HugeiconsIcon icon={Icon} strokeWidth={2.25} className="h-5 w-5" />}
                          </Link>
                        }
                      />
                      <TooltipContent side="right" align="center">{item.label}</TooltipContent>
                    </Tooltip>
                  </motion.div>
                );
              })}
              </TooltipProvider>
            </div>
          </React.Fragment>
        )}
      </AnimatePresence>
  );
}
