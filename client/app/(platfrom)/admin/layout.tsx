"use client";

import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon as DashboardSquare,
  UserGroupIcon as UserGroup,
  BarChartIcon as BarChart,
  CpuIcon as Cpu,
  Settings01Icon as Settings,
  ArrowLeft01Icon as ArrowLeft,
  Logout03Icon as LogoutIcon,
  MoonIcon as Moon,
  Sun01Icon as Sun,
  Layers01Icon as Layers,
  Mail01Icon as Mail,
  Megaphone01Icon as Megaphone,
  SlideIcon as Sliders,
  CloudServerIcon as CloudServer,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { getServerConfig } from "@/lib/server-config";
import { getSystemStatus } from "@/lib/admin-system";
import { LogoMark } from "@/components/logo";
import { logout } from "@/lib/auth";
import { usePlanLabel } from "@/hooks/use-plan-limit";
import {
  UserProvider,
  UserAvatar,
  useUser,
  useCurrentUserQuery,
  useSetCurrentUser,
} from "@/context/UserContext";

interface NavLeaf {
  label: string;
  href: string;
  icon?: IconSvgElement;
}
interface NavGroup {
  label: string;
  icon: IconSvgElement;
  children: NavLeaf[];
}
type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

// Content/Support/System groups from the original spec aren't here yet —
// their backends don't exist (Phase 2/3), and a nav item with nothing real
// behind it is worse than not showing it. Promotions/Rewards under Growth
// are the same story — deferred until there's something to manage.
const NAV_ENTRIES: NavEntry[] = [
  { label: "Overview", href: "/admin", icon: DashboardSquare },
  { label: "Users", href: "/admin/users", icon: UserGroup },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart },
  { label: "Emails", href: "/admin/emails", icon: Mail },
  { label: "AI Usage", href: "/admin/ai-usage", icon: Cpu },
  { label: "What's new", href: "/admin/whats-new", icon: Megaphone },
  { label: "Features", href: "/admin/features", icon: Sliders },
  { label: "Configuration", href: "/admin/configuration", icon: Settings },
  { label: "Infrastructure", href: "/admin/infrastructure", icon: CloudServer },
  { label: "Plans & Limits", href: "/admin/plans-limits", icon: Layers },
];

/**
 * Every leaf link, groups flattened, deduped by href — for the mobile pill
 * nav and topbar active-label lookup.
 */
const NAV_LEAVES: NavLeaf[] = (() => {
  const seen = new Set<string>();
  const leaves = NAV_ENTRIES.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]));
  return leaves.filter((leaf) => {
    if (seen.has(leaf.href)) return false;
    seen.add(leaf.href);
    return true;
  });
})();

/**
 * The nav for this install. A self-hosted install has one unlimited plan, so
 * Plans & Limits is hidden; Emails (bulk announcements) is hidden there too
 * until email is set up.
 */
function useAdminNav() {
  const { data: config } = useQuery({ queryKey: ["server-config"], queryFn: getServerConfig });
  const selfHosted = !!config?.selfHosted;
  const { data: system } = useQuery({ queryKey: ["admin", "system"], queryFn: getSystemStatus, enabled: selfHosted });
  const hidden = new Set<string>();
  if (selfHosted) {
    hidden.add("/admin/plans-limits");
    if (!system?.services.email) hidden.add("/admin/emails");
  }
  const keep = (leaf: NavLeaf) => !hidden.has(leaf.href);
  return {
    navEntries: NAV_ENTRIES.filter((entry) => isGroup(entry) || keep(entry)),
    navLeaves: NAV_LEAVES.filter(keep),
  };
}

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

/**
 * Deliberately its own shell — no shared chrome with the main app layout
 * (`(platfrom)/app/layout.tsx`). Sits at `/admin`, a sibling of `/app`, so
 * it never inherits that layout's sidebar/topbar tree. Re-does its own
 * auth-gate + UserProvider (same underlying hooks/context, just not nested
 * under the app shell) so admin pages can still call useUser().
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: currentUser, isLoading, isError } = useCurrentUserQuery();
  const setCurrentUser = useSetCurrentUser();
  const isAdmin = Boolean(currentUser?.roles.includes("admin"));

  useEffect(() => {
    if (isLoading) return;
    if (isError) {
      router.replace("/auth/login");
    } else if (currentUser && !isAdmin) {
      router.replace("/app");
    }
  }, [isLoading, isError, currentUser, isAdmin, router]);

  if (isLoading || isError || !currentUser || !isAdmin) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <LogoMark className="h-10 w-10 animate-pulse" />
      </div>
    );
  }

  return (
    <UserProvider user={currentUser} setUser={setCurrentUser}>
      <AdminShell>{children}</AdminShell>
    </UserProvider>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  // The billing plan, not the RBAC role — an admin is still on some plan.
  const planLabel = usePlanLabel();
  const { navEntries, navLeaves } = useAdminNav();

  const handleLogout = () => {
    logout().finally(() => router.push("/"));
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Distinct admin nav rail — uses the design system's dedicated
          sidebar tokens, unused elsewhere, so this reads as its own
          surface rather than a reskinned app sidebar. */}
      <aside className="w-56 shrink-0 hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border/60 shrink-0">
          <LogoMark className="h-7 w-7" />
          <span className="text-sm font-bold tracking-tight">Admin</span>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {navEntries.map((entry) =>
            isGroup(entry) ? (
              <div key={entry.label} className="space-y-0.5">
                <div className="px-3 pt-2 pb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-sidebar-foreground/45">
                  <HugeiconsIcon icon={entry.icon} strokeWidth={2.25} className="h-3.5 w-3.5" />
                  {entry.label}
                </div>
                {entry.children.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "ml-1 px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Link
                key={entry.href}
                href={entry.href}
                className={cn(
                  "px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2.5 transition-colors",
                  isActive(pathname, entry.href)
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {entry.icon && <HugeiconsIcon icon={entry.icon} strokeWidth={2.25} className="h-4 w-4" />}
                {entry.label}
              </Link>
            ),
          )}
        </nav>

        <div className="p-3 border-t border-sidebar-border/60 shrink-0">
          <Link
            href="/app"
            className="px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-4 w-4" />
            Back to app
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — mobile nav collapses into here; desktop just carries
            the page title context + user controls. */}
        <header className="h-16 border-b border-border/60 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <LogoMark className="h-7 w-7" />
            <span className="text-sm font-bold">Admin</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navLeaves.map((link) =>
              isActive(pathname, link.href) ? (
                <span key={link.href} className="text-xs font-bold text-foreground">
                  {link.label}
                </span>
              ) : null,
            )}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 rounded-full border border-border/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <HugeiconsIcon icon={Sun} strokeWidth={2.25} className="h-4 w-4" /> : <HugeiconsIcon icon={Moon} strokeWidth={2.25} className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-2">
              <UserAvatar user={user} className="h-8 w-8 text-xs border border-primary/20" />
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-bold text-foreground truncate max-w-32">{user.name ?? user.email}</p>
                <p className="text-[9px] text-muted-foreground font-mono leading-none">{planLabel.label}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="h-8 w-8 rounded-full border border-border/60 hover:bg-destructive/10 hover:border-destructive/30 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
            >
              <HugeiconsIcon icon={LogoutIcon} strokeWidth={2.25} className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile nav rail — the desktop aside (which carries "Back to app") is hidden below md */}
        <nav className="md:hidden flex items-center gap-1 px-4 py-2 border-b border-border/60 overflow-x-auto scrollbar-none shrink-0">
          <Link
            href="/app"
            className="px-2.5 py-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Back to app"
          >
            <HugeiconsIcon icon={ArrowLeft} strokeWidth={2.25} className="h-3.5 w-3.5" />
          </Link>
          <span className="h-4 w-px bg-border shrink-0" />
          {navLeaves.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-full text-nowrap transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">{children}</div>
        </main>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
