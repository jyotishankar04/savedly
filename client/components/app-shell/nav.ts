import type { IconSvgElement } from "@hugeicons/react";
import {
  SparklesIcon as Sparkles,
  Search01Icon as Search,
  FolderOpenIcon as FolderOpen,
  Note01Icon as NoteIcon,
  CompassIcon as Compass,
  InboxIcon as InboxNav,
  HeartIcon as Heart,
  Clock01Icon as Clock,
  BarChartIcon as BarChart2,
  CloudUploadIcon as UploadCloud,
  Layers01Icon as Layers,
  Tag01Icon as Tag,
  Archive01Icon as Archive,
  Delete02Icon as Trash2,
  TrendingUpIcon as TrendingUp,
  Plug01Icon as Plug,
  Share02Icon as Share2,
  LockPasswordIcon as VaultIcon,
  Calendar03Icon as CalendarIcon,
  BellIcon as Bell,
} from "@hugeicons/core-free-icons";
import type { Shelf } from "@/components/memory/collection-drop";

/** `logo` swaps the icon for the brand mark: used for the AI entry (Ask). */
export type NavItem = { label: string; href: string; icon: IconSvgElement; badge?: number; logo?: boolean };

export type NavSection = { id: string; label: string; items: NavItem[] };

/** Exact-matches Home ("/app"); prefix-matches everything else, so a nav
 * item for a list route (Tags, Collections, Memories) stays highlighted on
 * its own dynamic detail routes (/app/tags/foo, /app/collections/[id]). */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** How many collections the sidebar and the phone menu show before "show all". */
export const COLLECTIONS_PREVIEW_COUNT = 4;

/** The sidebar links that memories can be dropped on, and what dropping there does. */
export const SHELF_HREFS: Record<string, Shelf> = { "/app/favorites": "favorite", "/app/vault": "vault", "/app/archive": "archive", "/app/trash": "trash" };
export const SHELF_VERB: Record<Shelf, string> = { favorite: "Add", vault: "Lock", archive: "Archive", trash: "Trash" };

export function buildNav({ inboxUnread, unreadCount }: { inboxUnread: number; unreadCount: number }) {
  const primaryNavItems: NavItem[] = [
    { label: "Home", href: "/app", icon: Compass },
    { label: "Inbox", href: "/app/inbox", icon: InboxNav, badge: inboxUnread },
    { label: "Search", href: "/app/search", icon: Search },
    { label: "Ask Savedly", href: "/app/ask", icon: Sparkles, logo: true },
    { label: "Memories", href: "/app/memories", icon: FolderOpen },
    { label: "Notes", href: "/app/notes", icon: NoteIcon },
    { label: "Collections", href: "/app/collections", icon: Layers },
    { label: "Tags", href: "/app/tags", icon: Tag },
  ];
  // The rest of the app, grouped by what the visitor is doing: getting back
  // to things they kept, looking at their library from above, or setting up.
  const navSections: NavSection[] = [
    {
      id: "library",
      label: "Library",
      items: [
        { label: "Favorites", href: "/app/favorites", icon: Heart },
        { label: "Recent", href: "/app/recent", icon: Clock },
        { label: "Shared", href: "/app/shared", icon: Share2 },
        { label: "Vault", href: "/app/vault", icon: VaultIcon },
        { label: "Archive", href: "/app/archive", icon: Archive },
        { label: "Trash", href: "/app/trash", icon: Trash2 },
      ],
    },
    {
      id: "discover",
      label: "Discover",
      items: [
        { label: "Explore", href: "/app/explore", icon: Compass },
        { label: "Insights", href: "/app/insights", icon: TrendingUp },
        { label: "Memory Graph", href: "/app/graph", icon: BarChart2 },
        { label: "Calendar", href: "/app/calendar", icon: CalendarIcon },
      ],
    },
    {
      id: "workspace",
      label: "Workspace",
      items: [
        { label: "Notifications", href: "/app/notifications", icon: Bell, badge: unreadCount },
        { label: "Import", href: "/app/import", icon: UploadCloud },
        { label: "Integrations", href: "/app/integrations", icon: Plug },
      ],
    },
  ];
  const secondaryNavItems = navSections.flatMap((section) => section.items);
  return { primaryNavItems, navSections, secondaryNavItems };
}

export type AppNav = ReturnType<typeof buildNav>;
