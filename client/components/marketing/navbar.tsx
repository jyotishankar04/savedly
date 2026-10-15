"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GlidingHighlight } from "@/components/ui/gliding-highlight";
import { CHROME_WEB_STORE_URL } from "@/lib/extension";
import { DISCORD_URL, GITHUB_URL } from "@/lib/open-source";
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
  News01Icon,
  HelpCircleIcon,
  GitBranchIcon,
  BalanceScaleIcon,
  Tag01Icon,
  UserMultiple02Icon as UsersGroupIcon,
  UserIcon,
  HeartIcon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useCurrentUserQuery } from "@/context/UserContext";
import { SELF_HOSTED } from "@/lib/instance";
import { PlainNavbar } from "@/components/self-hosted/plain-chrome";
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
    description: "The full breakdown of what Savedly can do.",
    href: "/features",
  },
  {
    title: "How it works",
    icon: Layers01Icon,
    description: "One save followed step by step, and what runs where.",
    href: "/how-it-works",
  },
  {
    title: "Changelog",
    icon: GitBranchIcon,
    description: "What's new, release by release.",
    href: "/changelog",
  },
];

import { competitors } from "@/lib/data/comparisons";

// The phone menu's Compare list (the desktop menu is CompareMenu below).
const compareLinks: MenuEntry[] = [
  {
    title: "All Comparisons",
    icon: BalanceScaleIcon,
    description: "See how we stack up against all the alternatives.",
    href: "/vs",
  },
  ...competitors.map((c) => ({
    title: `vs ${c.name}`,
    icon: BalanceScaleIcon,
    description: c.type,
    href: `/vs/${c.slug}`,
  })),
];

// The Compare menu: plain links, grouped by the kind of app. A competitor
// added to lib/data/comparisons.ts without a group here lands in the last
// column, so it's never left out.
const COMPARE_GROUPS: { label: string; slugs: string[] }[] = [
  { label: "AI memory apps", slugs: ["mymind", "memorie", "fabric", "tome"] },
  { label: "Bookmarks & reading", slugs: ["raindrop", "readwise-reader", "glasp"] },
  { label: "Notes & workspaces", slugs: ["notion", "evernote", "google-keep", "capacities"] },
];

const compareColumns = COMPARE_GROUPS.map((group, i) => ({
  label: group.label,
  links: competitors
    .filter((c) => group.slugs.includes(c.slug) || (i === COMPARE_GROUPS.length - 1 && !COMPARE_GROUPS.some((g) => g.slugs.includes(c.slug))))
    .sort((a, b) => group.slugs.indexOf(a.slug) - group.slugs.indexOf(b.slug))
    .map((c) => ({ title: `vs ${c.name}`, href: `/vs/${c.slug}` })),
}));

interface MegaLink {
  title: string;
  href: string;
  /** Opens in a new tab (another site). */
  external?: boolean;
}

interface MegaMenuProps {
  title: string;
  blurb: string;
  cta: MegaLink;
  columns: { label: string; links: MegaLink[] }[];
}

// Each link is a row for the GlidingHighlight around the menu: the highlight
// slides to whichever link is under the pointer, and the link's text eases
// into the accent colour as it arrives. The negative margin keeps the text
// lined up with the column label while the padding gives the highlight room.
const MEGA_LINK =
  "relative z-[1] -mx-2.5 inline-block rounded-lg px-2.5 py-1.5 text-sm text-foreground transition-colors duration-300 ease-out hover:text-primary focus-visible:text-primary focus-visible:outline-none";

function MegaHref({ link, className, row, children }: { link: MegaLink; className: string; row?: boolean; children: React.ReactNode }) {
  const rowProps = row ? { "data-nav-row": "" } : {};
  return link.external ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className} {...rowProps}>
      {children}
    </a>
  ) : (
    <Link href={link.href} className={className} {...rowProps}>
      {children}
    </Link>
  );
}

/** A dropdown laid out as a heading with one button, then plain links in labelled columns. */
function MegaMenu({ title, blurb, cta, columns }: MegaMenuProps) {
  return (
    // Full width (see NavigationMenu fullWidth), with the content held to the
    // navbar's own width so it lines up with the logo.
    <GlidingHighlight
      as="div"
      highlightClassName="rounded-lg bg-primary/10"
      // 76rem with 3.5rem of padding puts the heading under the logo at every
      // width: the bar is 72rem plus its own padding, inside 2rem of gutter.
      // Centred against the window, not with mx-auto: while a panel fades out
      // the menu takes it out of the flow, and mx-auto would then snap it to
      // the left edge mid-fade.
      className="ml-[max(0px,calc((100vw-76rem)/2))] grid w-screen max-w-[76rem] gap-10 px-[3.125rem] py-9"
      style={{ gridTemplateColumns: `minmax(0, 1.3fr) repeat(3, minmax(0, 1fr))` }}
    >
      <div>
        <p className="text-xl font-medium tracking-[-0.02em] text-foreground">{title}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{blurb}</p>
        <MegaHref
          link={cta}
          className="mt-5 inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {cta.title}
        </MegaHref>
      </div>
      {columns.map((column) => (
        <div key={column.label}>
          <p className="text-[13px] text-muted-foreground">{column.label}</p>
          <ul className="mt-2.5 space-y-0.5">
            {column.links.map((link) => (
              <li key={link.href}>
                <MegaHref link={link} className={MEGA_LINK} row>
                  {link.title}
                </MegaHref>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </GlidingHighlight>
  );
}

const PRODUCT_MENU: MegaMenuProps = {
  title: "Product",
  blurb: "Everything Savedly does, and how it works.",
  cta: { title: "See all features", href: "/features" },
  columns: [
    {
      label: "Explore",
      links: [
        { title: "Features", href: "/features" },
        { title: "How it works", href: "/how-it-works" },
        { title: "Pricing", href: "/pricing" },
      ],
    },
    {
      label: "Get Savedly",
      links: [
        { title: "Chrome extension", href: CHROME_WEB_STORE_URL, external: true },
        { title: "Self-host it", href: "/help/docs/self-host/self-host" },
        { title: "Changelog", href: "/changelog" },
      ],
    },
  ],
};

const COMPARE_MENU: MegaMenuProps = {
  title: "Compare",
  blurb: "How Savedly stacks up against the apps people use today.",
  cta: { title: "All comparisons", href: "/vs" },
  columns: compareColumns,
};

const RESOURCES_MENU: MegaMenuProps = {
  title: "Resources",
  blurb: "Guides, notes from the team, and people to ask.",
  cta: { title: "Help Center", href: "/help" },
  columns: [
    {
      label: "Learn",
      links: [
        { title: "Getting started", href: "/help/docs/get-started/getting-started" },
        { title: "Save from Chrome", href: "/help/docs/get-started/extension" },
        { title: "Import your bookmarks", href: "/help/docs/get-started/import" },
        { title: "Self-host it", href: "/help/docs/self-host/self-host" },
      ],
    },
    {
      label: "Read",
      links: [
        { title: "Blog", href: "/blog" },
        { title: "RSS feed", href: "/blog/feed.xml" },
        { title: "Changelog", href: "/changelog" },
      ],
    },
    {
      label: "Talk to us",
      links: [
        { title: "Community", href: "/community" },
        { title: "Discord", href: DISCORD_URL, external: true },
        { title: "Report a bug or idea", href: "/report" },
      ],
    },
  ],
};

const COMPANY_MENU: MegaMenuProps = {
  title: "Company",
  blurb: "The people behind Savedly, in Bhubaneswar.",
  cta: { title: "About us", href: "/about" },
  columns: [
    {
      label: "Savedly",
      links: [
        { title: "Contact", href: "/contact" },
        { title: "Contribute", href: "/contribute" },
        { title: "GitHub", href: GITHUB_URL, external: true },
      ],
    },
    {
      label: "Trust",
      links: [
        { title: "Security", href: "/security" },
        { title: "Privacy", href: "/privacy" },
        { title: "Terms", href: "/terms" },
        { title: "Cookies", href: "/cookies" },
      ],
    },
  ],
};

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
// The phone menu's rows: 44px tall, so they're easy to hit with a thumb.
const MOBILE_MENU_ROW =
  "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

function MobileMenuSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{label}</h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function MobileMenuRow({ entry, active, onNavigate }: { entry: MenuEntry; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={entry.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(MOBILE_MENU_ROW, active ? "bg-primary/10 text-primary" : "text-foreground active:bg-muted")}
    >
      <HugeiconsIcon icon={entry.icon} strokeWidth={2} className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <span className="min-w-0 flex-1 truncate">{entry.title}</span>
    </Link>
  );
}

/** The site header. A self-hosted install gets the plain one: it has no product pages to link to. */
export function Navbar() {
  return SELF_HOSTED ? <PlainNavbar /> : <MarketingNavbar />;
}

function MarketingNavbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  // While a dropdown is open the whole bar takes the dropdown's colour, edge
  // to edge, so the two read as one sheet over the dimmed page.
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const pathname = usePathname();
  const bannerRef = React.useRef<HTMLDivElement>(null);
  const [bannerHeight, setBannerHeight] = React.useState(0);
  React.useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setBannerHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const closeMenu = () => setMenuOpen(false);
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
    <>
    {/* The banner is part of the fixed header, so it takes no room in the
        page. This spacer gives it some: without it, a banner (taller still
        once it wraps on a phone) pushes the navbar down over the page's
        heading. */}
    <div aria-hidden style={{ height: bannerHeight }} />
    <div className="fixed inset-x-0 top-0 z-50">
      <MaintenanceModal />
      <div ref={bannerRef}>
        <AnnouncementBanner />
      </div>
      {/* While open, the bar's colour also runs 8px down under the dropdown (a
          shadow, so nothing moves): wherever the two edges meet on a fraction
          of a pixel, the dropdown's top edge then blends into the same colour
          instead of showing a hairline of page between them. */}
      <header
        className={cn(
          "w-full px-4 pt-4 transition-[background-color,box-shadow] duration-200 sm:px-8",
          dropdownOpen ? "bg-popover shadow-[0_8px_0_0_var(--popover)]" : "bg-transparent shadow-none",
        )}
      >
      <nav
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center px-3 rounded-full border transition-all duration-300",
          dropdownOpen
            ? "border-transparent bg-transparent shadow-none"
            : isScrolled
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
        {/* One highlight glides between the items under the pointer (GlidingHighlight),
            as in the app's sidebars. An open menu's item keeps its own fill. */}
        <GlidingHighlight as="div" highlightClassName="rounded-full bg-muted" className="mx-auto hidden md:flex">
          <NavigationMenu fullWidth onValueChange={(value) => setDropdownOpen(value != null)}>
            <NavigationMenuList className="gap-1">
              {/* Product */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  data-nav-row=""
                  className={cn(
                    "relative z-[1] h-9 rounded-full bg-transparent px-4 text-sm font-medium transition-colors duration-300 data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
                    "text-muted-foreground hover:text-foreground hover:bg-transparent focus:bg-transparent"
                  )}
                >
                  Product
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <MegaMenu {...PRODUCT_MENU} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Compare */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  data-nav-row=""
                  className={cn(
                    "relative z-[1] h-9 rounded-full bg-transparent px-4 text-sm font-medium transition-colors duration-300 data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
                    "text-muted-foreground hover:text-foreground hover:bg-transparent focus:bg-transparent"
                  )}
                >
                  Compare
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <MegaMenu {...COMPARE_MENU} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Resources */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  data-nav-row=""
                  className={cn(
                    "relative z-[1] h-9 rounded-full bg-transparent px-4 text-sm font-medium transition-colors duration-300 data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
                    "text-muted-foreground hover:text-foreground hover:bg-transparent focus:bg-transparent"
                  )}
                >
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <MegaMenu {...RESOURCES_MENU} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Company */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  data-nav-row=""
                  className={cn(
                    "relative z-[1] h-9 rounded-full bg-transparent px-4 text-sm font-medium transition-colors duration-300 data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
                    "text-muted-foreground hover:text-foreground hover:bg-transparent focus:bg-transparent"
                  )}
                >
                  Company
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <MegaMenu {...COMPANY_MENU} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Pricing (Outside Dropdown) */}
              <NavigationMenuItem>
                <Link
                  href="/pricing"
                  data-nav-row=""
                  className={cn(
                    "relative z-[1] inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors duration-300",
                    "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pricing
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </GlidingHighlight>

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
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
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
            {/* Three rows: the logo, a list that scrolls on its own, and the
                sign-in actions pinned where a thumb reaches them. */}
            <SheetContent side="right" className="w-[88vw] max-w-sm gap-0 border-l border-border bg-background p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Mobile navigation menu for Savedly.
              </SheetDescription>

              <div className="flex h-16 shrink-0 items-center border-b border-border/60 px-5 pt-[env(safe-area-inset-top)] box-content">
                <Logo className="text-[17px] text-foreground" />
              </div>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-5 [-webkit-overflow-scrolling:touch]">
                <MobileMenuSection label="Product">
                  {productLinks.map((entry) => (
                    <MobileMenuRow key={entry.title} entry={entry} active={pathname === entry.href} onNavigate={closeMenu} />
                  ))}
                  <MobileMenuRow entry={{ title: "Pricing", href: "/pricing", icon: Tag01Icon, description: "" }} active={pathname === "/pricing"} onNavigate={closeMenu} />
                </MobileMenuSection>

                <MobileMenuSection label="Resources">
                  {resourceLinks.map((entry) => (
                    <MobileMenuRow key={entry.title} entry={entry} active={pathname === entry.href} onNavigate={closeMenu} />
                  ))}
                </MobileMenuSection>

                {/* A dozen competitor pages would bury everything below them, so
                    the list stays folded behind its own row. */}
                <MobileMenuSection label="Compare">
                  <MobileMenuRow entry={compareLinks[0]} active={pathname === compareLinks[0].href} onNavigate={closeMenu} />
                  <button
                    type="button"
                    onClick={() => setCompareOpen((open) => !open)}
                    aria-expanded={compareOpen}
                    className={cn(MOBILE_MENU_ROW, "w-full text-left text-foreground active:bg-muted")}
                  >
                    <span className="w-5 shrink-0" />
                    <span className="flex-1">{compareOpen ? "Hide the list" : `Compare with ${compareLinks.length - 1} tools`}</span>
                    <HugeiconsIcon icon={ChevronRight} strokeWidth={2.25} className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", compareOpen && "rotate-90")} />
                  </button>
                  {compareOpen &&
                    compareLinks.slice(1).map((entry) => (
                      <Link
                        key={entry.title}
                        href={entry.href}
                        onClick={closeMenu}
                        className={cn(MOBILE_MENU_ROW, "h-10 pl-11 text-[14px]", pathname === entry.href ? "bg-primary/10 text-primary" : "text-muted-foreground active:bg-muted")}
                      >
                        {entry.title}
                      </Link>
                    ))}
                </MobileMenuSection>

                <MobileMenuSection label="Company">
                  {companyLinks.map((entry) => (
                    <MobileMenuRow key={entry.title} entry={entry} active={pathname === entry.href} onNavigate={closeMenu} />
                  ))}
                </MobileMenuSection>
              </div>

              <div className="shrink-0 space-y-2.5 border-t border-border/60 bg-background px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {isAuthenticated ? (
                  <Link
                    href={ctaHref("/app")}
                    onClick={closeMenu}
                    className={cn(
                      buttonVariants({ variant: "default", size: "default" }),
                      "w-full h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center font-medium"
                    )}
                  >
                    <HugeiconsIcon icon={LayoutDashboard} strokeWidth={2.25} className="mr-1.5 h-4 w-4" />
                    Go to Dashboard
                  </Link>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href={ctaHref("/auth/login")}
                      onClick={closeMenu}
                      className="flex h-11 items-center justify-center rounded-full border border-border text-sm font-medium text-foreground transition-colors active:bg-muted"
                    >
                      Sign in
                    </Link>
                    <Link
                      href={ctaHref("/auth/signup")}
                      onClick={closeMenu}
                      className={cn(
                        buttonVariants({ variant: "default", size: "default" }),
                        "h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center font-medium"
                      )}
                    >
                      Get started
                    </Link>
                  </div>
                )}
                <GithubStarButton variant="menu" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      </header>
    </div>
    </>
  );
}
