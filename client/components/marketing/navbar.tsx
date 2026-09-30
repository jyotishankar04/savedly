"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChevronRightIcon as ChevronRight,
  Menu01Icon as Menu,
  MoonIcon as Moon,
  Sun01Icon as Sun,
  LayoutDashboardIcon as LayoutDashboard,
  CloudUploadIcon,
  Layers01Icon,
  SparklesIcon,
  ChartRelationshipIcon,
  News01Icon,
  HelpCircleIcon,
  GitBranchIcon,
  BalanceScaleIcon,
  UserMultiple02Icon as UsersGroupIcon,
  UserIcon,
  HeartIcon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useCurrentUserQuery } from "@/context/UserContext";
import { AnnouncementBanner } from "@/components/marketing/announcement-banner";
import { MaintenanceModal } from "@/components/marketing/maintenance-modal";
import { ctaHref } from "@/lib/showcase";
import { GithubStarButton } from "@/components/marketing/github-star-button";

// Reverted to the floating/popup pill style — the one before it was swapped
// for a solid border-b "Navigation2"-style bar. That version's real content
// carries over: the mega-menu still points at /features#everywhere etc.
// (not the four now-deleted /features/* sub-pages), and "How it works" now
// points at /features#how-it-works rather than the /how-it-works page,
// which had already been deleted from this repo (visible in this session's
// very first `git status`, before any of this navbar work started) — the
// last pill version predates that fix, so it's carried forward here too.
interface MenuEntry {
  title: string;
  description: string;
  href: string;
  icon: IconSvgElement;
}

const productLinks: MenuEntry[] = [
  {
    title: "Features",
    icon: CloudUploadIcon,
    description: "The full breakdown of what SaveForLatter can do.",
    href: "/features",
  },
  {
    title: "How it works",
    icon: Layers01Icon,
    description: "See the ingestion and search pipeline in action.",
    href: "/features#how-it-works",
  },
  {
    title: "Changelog",
    icon: GitBranchIcon,
    description: "What's new, release by release.",
    href: "/changelog",
  },
];

import { competitors } from "@/lib/data/comparisons";

const compareLinks: MenuEntry[] = [
  {
    title: "All Comparisons",
    icon: BalanceScaleIcon,
    description: "See how we stack up against all the alternatives.",
    href: "/vs",
  },
  ...competitors.map(c => ({
    title: `vs ${c.name}`,
    icon: BalanceScaleIcon,
    description: c.type,
    href: `/vs/${c.slug}`,
  }))
];

const resourceLinks: MenuEntry[] = [
  {
    title: "Blog",
    icon: News01Icon,
    description: "Notes on what we're building.",
    href: "/blog",
  },
  {
    title: "Help Center",
    icon: HelpCircleIcon,
    description: "Guides for every feature.",
    href: "/help",
  },
  {
    title: "Community",
    icon: UsersGroupIcon,
    description: "Join the discussion.",
    href: "/community",
  },
];

const companyLinks: MenuEntry[] = [
  {
    title: "About Us",
    icon: UserIcon,
    description: "Our core beliefs and mission.",
    href: "/about",
  },
  {
    title: "Contribute",
    icon: HeartIcon,
    description: "Support the open-source project.",
    href: "/contribute",
  },
  {
    title: "Contact",
    icon: Mail01Icon,
    description: "Get in touch with the team.",
    href: "/contact",
  },
];

/** One dropdown row: rounded icon tile, bold title, muted subtitle. */
function MenuRow({ entry }: { entry: MenuEntry }) {
  return (
    <Link href={entry.href} className="group flex items-center gap-3.5 rounded-xl p-2.5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <HugeiconsIcon icon={entry.icon} strokeWidth={1.75} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{entry.title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{entry.description}</span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const pathname = usePathname();
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUserQuery();
  const isAuthenticated = !!currentUser;


  React.useEffect(() => {
    // Must start false on both server and first client render (mount flag
    // avoids a hydration mismatch); flipped true only after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    const handleScroll = () => {
      if (window.scrollY > 15) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <MaintenanceModal />
      <AnnouncementBanner />
      <header className="mt-4 w-full px-4 sm:px-8">
      <nav
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center px-3 rounded-full border transition-all duration-300",
          isScrolled
            ? "border-border/50 bg-background backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.24)]"
            : "border-transparent bg-transparent shadow-none"
        )}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 px-3 hover:opacity-90 transition-opacity shrink-0"
        >
          <Logo className="text-[17px] text-foreground transition-colors duration-300" />
        </Link>

        {/* Desktop Navigation */}
        <div className="mx-auto hidden md:flex">
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              {/* Product */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    "h-9 rounded-full bg-transparent px-4 text-sm font-medium transition-all duration-300 data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
                    "text-muted-foreground hover:text-foreground hover:bg-muted focus:bg-muted"
                  )}
                >
                  Product
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[360px] p-1.5">
                    {productLinks.map((entry) => (
                      <MenuRow key={entry.title} entry={entry} />
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Compare */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    "h-9 rounded-full bg-transparent px-4 text-sm font-medium transition-all duration-300 data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
                    "text-muted-foreground hover:text-foreground hover:bg-muted focus:bg-muted"
                  )}
                >
                  Compare
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[600px] grid grid-cols-2 p-1.5 gap-x-2 gap-y-1">
                    {compareLinks.map((entry) => (
                      <MenuRow key={entry.title} entry={entry} />
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Resources */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    "h-9 rounded-full bg-transparent px-4 text-sm font-medium transition-all duration-300 data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
                    "text-muted-foreground hover:text-foreground hover:bg-muted focus:bg-muted"
                  )}
                >
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[320px] p-1.5">
                    {resourceLinks.map((entry) => (
                      <MenuRow key={entry.title} entry={entry} />
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Company */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    "h-9 rounded-full bg-transparent px-4 text-sm font-medium transition-all duration-300 data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
                    "text-muted-foreground hover:text-foreground hover:bg-muted focus:bg-muted"
                  )}
                >
                  Company
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[320px] p-1.5">
                    {companyLinks.map((entry) => (
                      <MenuRow key={entry.title} entry={entry} />
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Pricing (Outside Dropdown) */}
              <NavigationMenuItem>
                <Link
                  href="/pricing"
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-all duration-300",
                    "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  Pricing
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Desktop Right Actions */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          {/* Only from lg up: at md the bar is already full. The mobile menu carries it below. */}
          <GithubStarButton variant="nav" className="hidden lg:inline-flex" />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-full transition-all duration-300",
              "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted && theme === "dark" ? (
              <HugeiconsIcon icon={Sun} strokeWidth={2.25} className="h-[18px] w-[18px] transition-all" />
            ) : (
              <HugeiconsIcon icon={Moon} strokeWidth={2.25} className="h-[18px] w-[18px] transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {isUserLoading ? (
            <div
              className={cn(
                "h-9 w-28 rounded-full animate-pulse",
                "bg-muted"
              )}
            />
          ) : isAuthenticated ? (
            <Link
              href={ctaHref("/app")}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "h-9 rounded-full px-4 text-sm font-medium shadow-sm transition-all duration-200 flex items-center",
                "bg-primary text-primary-foreground hover:bg-primary/95"
              )}
            >
              <HugeiconsIcon icon={LayoutDashboard} strokeWidth={2.25} className="mr-1.5 h-4 w-4" />
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href={ctaHref("/auth/login")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
                  "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Sign in
              </Link>

              <Link
                href={ctaHref("/auth/signup")}
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "h-9 rounded-full px-4 text-sm font-medium shadow-sm transition-all duration-200 flex items-center",
                  "bg-primary text-primary-foreground hover:bg-primary/95"
                )}
              >
                Get started
                <HugeiconsIcon icon={ChevronRight} strokeWidth={2.25} className="ml-1 h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="ml-auto flex md:hidden items-center gap-1.5">
          {/* Theme Toggle (Mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-full transition-all duration-300",
              "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted && theme === "dark" ? (
              <HugeiconsIcon icon={Sun} strokeWidth={2.25} className="h-[18px] w-[18px] transition-all" />
            ) : (
              <HugeiconsIcon icon={Moon} strokeWidth={2.25} className="h-[18px] w-[18px] transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Auth CTA (Mobile sm+) */}
          {!isUserLoading && (
            <Link
              href={ctaHref(isAuthenticated ? "/app" : "/auth/signup")}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "hidden sm:inline-flex h-9 rounded-full px-4 text-xs font-medium shadow-sm transition-all duration-200 flex items-center",
                "bg-primary text-primary-foreground hover:bg-primary/95"
              )}
            >
              {isAuthenticated ? "Dashboard" : "Get started"}
            </Link>
          )}

          {/* Hamburger Sheet */}
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full transition-all duration-300",
                    "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                />
              }
            >
              <HugeiconsIcon icon={Menu} strokeWidth={2.25} className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:max-w-sm p-6 bg-background border-l border-border flex flex-col justify-between"
            >
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Mobile navigation menu for SaveForLatter.
              </SheetDescription>
              <div>
                <div className="flex items-center gap-2 mb-8 pr-10">
                  <Logo className="text-[17px] text-foreground" />
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Product
                    </h4>
                    <div className="space-y-1 mb-6">
                      {productLinks.map((entry) => (
                        <Link
                          key={entry.title}
                          href={entry.href}
                          className="block px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                        >
                          {entry.title}
                        </Link>
                      ))}
                      <Link
                        href="/pricing"
                        className="block px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                      >
                        Pricing
                      </Link>
                    </div>

                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Compare
                    </h4>
                    <div className="space-y-1 mb-6">
                      {compareLinks.map((entry) => (
                        <Link
                          key={entry.title}
                          href={entry.href}
                          className="block px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                        >
                          {entry.title}
                        </Link>
                      ))}
                    </div>

                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Resources
                    </h4>
                    <div className="space-y-1 mb-6">
                      {resourceLinks.map((entry) => (
                        <Link
                          key={entry.title}
                          href={entry.href}
                          className="block px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                        >
                          {entry.title}
                        </Link>
                      ))}
                    </div>

                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Company
                    </h4>
                    <div className="space-y-1">
                      {companyLinks.map((entry) => (
                        <Link
                          key={entry.title}
                          href={entry.href}
                          className="block px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                        >
                          {entry.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-border mt-auto">
                <GithubStarButton variant="menu" />
                {isAuthenticated ? (
                  <Link
                    href={ctaHref("/app")}
                    className={cn(
                      buttonVariants({ variant: "default", size: "default" }),
                      "w-full h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center font-medium"
                    )}
                  >
                    <HugeiconsIcon icon={LayoutDashboard} strokeWidth={2.25} className="mr-1.5 h-4 w-4" />
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href={ctaHref("/auth/login")}
                      className="
                        flex h-10 items-center justify-center rounded-full
                        text-sm font-medium text-foreground border border-border
                        hover:bg-muted transition-colors
                      "
                    >
                      Sign in
                    </Link>
                    <Link
                      href={ctaHref("/auth/signup")}
                      className={cn(
                        buttonVariants({ variant: "default", size: "default" }),
                        "w-full h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center font-medium"
                      )}
                    >
                      Get started
                      <HugeiconsIcon icon={ChevronRight} strokeWidth={2.25} className="ml-1 h-4 w-4" />
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      </header>
    </div>
  );
}
