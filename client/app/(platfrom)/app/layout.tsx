"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { MaintenanceFullPage } from "@/components/maintenance/maintenance-full-page";
import { getMaintenanceStatus } from "@/lib/maintenance";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { SparklesIcon as Sparkles, PlusIcon as Plus, Search01Icon as Search, Settings01Icon as Settings, HelpCircleIcon as HelpCircle, BellIcon as Bell, MoonIcon as Moon, Sun01Icon as Sun, FolderOpenIcon as FolderOpen, CompassIcon as Compass, CheckIcon as Check, ChevronDownIcon as ChevronDown, FolderPlusIcon as FolderPlus, HeartIcon as Heart, Clock01Icon as Clock, CompassIcon, BarChartIcon as BarChart2, CloudUploadIcon as UploadCloud, Layers01Icon as Layers, PanelLeftCloseIcon as PanelLeftClose, PanelLeftOpenIcon as PanelLeftOpen, Menu01Icon as Menu, Tag01Icon as Tag, KeyboardIcon as Keyboard, Archive01Icon as Archive, Delete02Icon as Trash2, TrendingUpIcon as TrendingUp, Plug01Icon as Plug, MessageSquarePlusIcon as MessageSquarePlus, HistoryIcon as History, ShieldUserIcon as ShieldUser, Share02Icon as Share2, LockPasswordIcon as VaultIcon, Calendar03Icon as CalendarIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { UserAvatar, UserProvider, useUser, useCurrentUserQuery, useSetCurrentUser } from "@/context/UserContext";
import { SetupPanel } from "@/components/setup/setup-panel";
import { useMemories } from "@/context/MemoryContext";
import { SidebarStateProvider } from "@/context/SidebarContext";
import { uploadFile, type UploadedFile } from "@/lib/uploads";
import { usePlanLabel, usePlanLimit } from "@/hooks/use-plan-limit";
import { useRecentEventNotificationsQuery, useUnreadCountQuery } from "@/hooks/use-notifications";
import type { AppNotification } from "@/lib/notifications";
import type { Collection } from "@/types/memory";
import { LiveEventDetectedPopup } from "@/components/memory/event-detected-popup";
import { DuplicateAskHost, LiveDuplicatePopup, wasDuplicatePopupDismissed } from "@/components/memory/duplicate-dialog";
import { DuplicateSkippedError } from "@/context/MemoryContext";
import { useLockVaultMutation } from "@/hooks/use-vault";
import { PlanLimitNotice, LimitDot } from "@/components/plan-limit-notice";
import { detectMemoryType, deriveTitle, splitLinkAndCaption } from "@/lib/detect-memory-type";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { GlidingHighlight } from "@/components/ui/gliding-highlight";
import { AccentColor } from "@/components/accent-color";
import { PaletteDialog, type PaletteItem } from "@/components/ui/palette-dialog";
import { Textarea as ArcTextarea } from "@/components/arc/textarea/textarea";
import { Input as ArcInput } from "@/components/arc/input/input";
import { Button as ArcButton } from "@/components/arc/button/button";
import { Badge as ArcBadge } from "@/components/arc/badge/badge";
import { FileDropzone, type FileDropzoneUpload } from "@/components/arc/file-dropzone/file-dropzone";
import { ShortcutList, formatShortcut, usePlatform, type ShortcutListGroup } from "@/components/arc/shortcut-recorder/shortcut-recorder";
import { Logo, LogoMark } from "@/components/logo";
import { NextStepProvider, NextStep } from "nextstepjs";
import { useNextAdapter } from "nextstepjs/adapters/next";
import { productTourSteps, TourCard, TourAutoStart } from "@/components/product-tour";
import { AskWidget } from "@/components/ask-widget/ask-widget";
import { useSyncTimeZone } from "@/hooks/use-settings-group";

/** Exact-matches Home ("/app"); prefix-matches everything else, so a nav
 * item for a list route (Tags, Collections, Memories) stays highlighted on
 * its own dynamic detail routes (/app/tags/foo, /app/collections/[id]). */
function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** `logo` swaps the icon for the brand mark: used for the AI entry (Ask). */
type NavItem = { label: string; href: string; icon: IconSvgElement; badge?: number; logo?: boolean };

const CLOSED_SECTIONS_KEY = "sfl:sidebar-closed-sections";

function readClosedSections(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CLOSED_SECTIONS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

const SIDEBAR_ROW =
  "relative z-[1] flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

// The phone menu's rows: taller than the sidebar's, for a thumb.
const MOBILE_MENU_ROW =
  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

function MobileMenuLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(MOBILE_MENU_ROW, active ? "bg-primary/10 text-primary" : "text-foreground active:bg-muted")}
    >
      {item.logo ? (
        <LogoMark ticks={false} className="h-5 w-5 shrink-0" />
      ) : (
        <HugeiconsIcon icon={item.icon} strokeWidth={2} className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      )}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums">{item.badge > 99 ? "99+" : item.badge}</span>
      ) : null}
    </Link>
  );
}

const PROFILE_MENU_ITEM =
  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none";

function SidebarLink({ item, active, ...rest }: { item: NavItem; active: boolean; "data-tour"?: string }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      data-nav-row=""
      {...rest}
      className={cn(
        SIDEBAR_ROW,
        // No hover fill of its own: the nav's one highlight glides to it (GlidingHighlight).
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
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

/** A labelled, foldable group of sidebar links. */
function SidebarSection({
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

/** Quick Capture's collection picker: a searchable popover with the picks
 * shown as removable chips above the trigger, instead of every collection
 * rendered flat as its own pill — which used to overflow the whole modal
 * once an account had more than a handful of collections. */
/** How many collections Quick Capture shows before "Show all". */
const CAPTURE_COLLECTIONS_SHOWN = 8;

/**
 * Collections to file a save under, as chips to switch on and off. Laid out
 * in the form itself, not in a popover: it then works the same in the desktop
 * dialog and in the phone's bottom sheet, and what is chosen is always in view.
 */
function CaptureCollectionPicker({
  collections,
  selectedIds,
  onChange,
}: {
  collections: Collection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  // Chosen ones first, so they stay in view when the list is cut short.
  const sorted = [...collections].sort((a, b) => Number(selectedIds.includes(b.id)) - Number(selectedIds.includes(a.id)) || a.name.localeCompare(b.name));
  const shown = showAll ? sorted : sorted.slice(0, Math.max(CAPTURE_COLLECTIONS_SHOWN, selectedIds.length));
  const hidden = sorted.length - shown.length;

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">Collections</legend>

      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have none yet. Savedly suggests one after you save.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((col) => {
            const on = selectedIds.includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(col.id)}
                title={col.name}
                className={cn(
                  "inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-150",
                  on ? "border-primary/40 bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                )}
              >
                <span aria-hidden>{col.icon}</span>
                <span className="truncate">{col.name}</span>
                {on && <HugeiconsIcon icon={Check} strokeWidth={2.5} className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
          {hidden > 0 && (
            <button type="button" onClick={() => setShowAll(true)} className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
              Show {hidden} more
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}

// What the shortcuts dialog lists. "mod" is ⌘ on a Mac and Ctrl elsewhere;
// the dialog draws the right one for whoever is looking. The keys themselves
// are handled further down, in the layout's keydown listeners.
const KEYBOARD_SHORTCUTS: ShortcutListGroup[] = [
  {
    label: "Anywhere",
    items: [
      { label: "Open search", shortcut: "mod+k", keywords: "find command palette" },
      { label: "Quick capture", shortcut: "mod+q", keywords: "save new add memory" },
      { label: "Show keyboard shortcuts", shortcut: "mod+/", keywords: "help keys" },
      { label: "Close an open menu", shortcut: "escape", keywords: "esc dismiss cancel" },
    ],
  },
  {
    label: "Sidebar",
    items: [
      { label: "Show or hide the sidebar", shortcut: "mod+b", keywords: "toggle collapse" },
      { label: "Open the sidebar menu", shortcut: "mod+m", keywords: "navigation collapsed" },
    ],
  },
  {
    label: "Go to",
    items: [
      { label: "Notifications", shortcut: "mod+n", keywords: "alerts inbox" },
      { label: "Settings", shortcut: "mod+p", keywords: "preferences account" },
    ],
  },
  {
    label: "On Ask Savedly",
    items: [
      { label: "New chat", shortcut: "mod+j", keywords: "conversation ask" },
      { label: "Chat history", shortcut: "mod+h", keywords: "past conversations threads" },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Maintenance gate takes priority over the auth gate below — /app is
  // fully hidden while maintenance is on (admins manage it from /admin
  // instead, which this layout doesn't cover). Polls so it recovers on its
  // own once an admin turns maintenance back off, no reload needed.
  const { data: maintenance } = useQuery({
    queryKey: ["maintenance", "status"],
    queryFn: getMaintenanceStatus,
    staleTime: 60 * 1000,
    refetchInterval: 15 * 1000,
    retry: 1,
  });

  // Auth gate: the access token lives in an httpOnly cookie the backend set,
  // so this client can't check for it locally — it asks /auth/me instead.
  // Redirects to login if that fails, or to /onboard if the signed-in user
  // hasn't finished the onboarding questionnaire yet (covers direct
  // navigation to /app, not just the post-OAuth-login redirect).
  const { data: currentUser, isLoading, isError } = useCurrentUserQuery();
  const setCurrentUser = useSetCurrentUser();
  const needsOnboarding = Boolean(currentUser && !currentUser.onboardingCompleted);

  useEffect(() => {
    if (isLoading) return;
    if (isError) {
      router.replace("/auth/login");
    } else if (needsOnboarding) {
      router.replace("/onboard");
    }
  }, [isLoading, isError, needsOnboarding, router]);

  if (maintenance?.enabled) {
    return <MaintenanceFullPage message={maintenance.message} />;
  }

  if (isLoading || isError || !currentUser || needsOnboarding) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <LogoMark className="h-10 w-10 animate-pulse" />
      </div>
    );
  }

  return (
    <UserProvider user={currentUser} setUser={setCurrentUser}>
      <AppShell>{children}</AppShell>
    </UserProvider>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user: currentUser } = useUser();
  const { collections, create } = useMemories();
  const memoryLimit = usePlanLimit("memory_count");
  const storageLimit = usePlanLimit("storage_mb");

  // Leaving /app/vault for any other page locks it — this lives here rather
  // than in the vault page itself because this shell persists across every
  // /app/* navigation, so a real route change is the only thing that can
  // trigger it. An unmount-cleanup on the vault page would also fire once,
  // synthetically, from React's StrictMode double-invoke in development,
  // re-locking the vault the instant that page first mounts.
  const lockVaultMutation = useLockVaultMutation();
  const lockVaultRef = useRef(lockVaultMutation.mutate);
  useEffect(() => {
    lockVaultRef.current = lockVaultMutation.mutate;
  });
  const previousPathnameRef = useRef(pathname);
  useEffect(() => {
    if (previousPathnameRef.current === "/app/vault" && pathname !== "/app/vault") {
      lockVaultRef.current();
    }
    previousPathnameRef.current = pathname;
  }, [pathname]);

  // Live "want to add this to your calendar?" popup — surfaces a detected
  // event immediately if the user happens to be on the site when ingestion
  // finishes, rather than waiting for them to visit /app/notifications.
  // Rides the same 60s poll as the bell badge (no websocket in this app);
  // the email sent alongside this notification already covers the case
  // where the user isn't around to see it live.
  // So event detection reads "3 pm" in the user's own time zone.
  useSyncTimeZone();
  const { data: recentNotifications } = useRecentEventNotificationsQuery();
  const seenEventPopupIds = useRef<Set<string>>(new Set());
  const [eventPopupNotification, setEventPopupNotification] = useState<AppNotification | null>(null);
  // The same, for a duplicate found in something saved elsewhere (the
  // extension, a share from a phone) while this tab is open.
  const [duplicatePopup, setDuplicatePopup] = useState<AppNotification | null>(null);
  useEffect(() => {
    if (duplicatePopup || eventPopupNotification) return;
    const next = recentNotifications?.find(
      (n) => n.type === "duplicate_detected" && !seenEventPopupIds.current.has(n.id) && !wasDuplicatePopupDismissed(n.id),
    );
    if (next) {
      seenEventPopupIds.current.add(next.id);
      setDuplicatePopup(next);
    }
  }, [recentNotifications, duplicatePopup, eventPopupNotification]);

  useEffect(() => {
    if (eventPopupNotification) return;
    const next = recentNotifications?.find(
      (n) => n.type === "event_detected" && !seenEventPopupIds.current.has(n.id),
    );
    if (next) {
      seenEventPopupIds.current.add(next.id);
      setEventPopupNotification(next);
    }
  }, [recentNotifications, eventPopupNotification]);

  const handleLogout = () => {
    logout().finally(() => {
      setUserDropdownOpen(false);
      router.push("/");
    });
  };

  // Modals
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveStep, setSaveStep] = useState<1 | "done">(1);
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [captureCollectionIds, setCaptureCollectionIds] = useState<string[]>([]);
  const [captureAttachment, setCaptureAttachment] = useState<UploadedFile | null>(null);
  const [captureAttachmentName, setCaptureAttachmentName] = useState<string | null>(null);
  const [captureAttachmentMimeType, setCaptureAttachmentMimeType] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const captureFormRef = useRef<HTMLFormElement>(null);
  const [savedTitle, setSavedTitle] = useState("");
  const [savedCollections, setSavedCollections] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  // The phone-width stand-in for the sidebar, opened from the bottom bar.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Which sidebar sections the user folded away, remembered across visits.
  const [closedSections, setClosedSections] = useState<string[]>(readClosedSections);
  const toggleSection = (id: string) => {
    setClosedSections((closed) => {
      const next = closed.includes(id) ? closed.filter((s) => s !== id) : [...closed, id];
      try {
        localStorage.setItem(CLOSED_SECTIONS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const [collectionsShowAll, setCollectionsShowAll] = useState(false);
  const COLLECTIONS_PREVIEW_COUNT = 4;
  // Sidebar collapse is a 3-stage sequence rather than one simultaneous
  // toggle: the Quick Capture button morphs into a circle first (still
  // docked, sidebar unchanged), then the sidebar hides, then the circle
  // slides out to its floating dock below the menu button. Expanding runs
  // the same sequence in reverse. Each named phase drives both the aside's
  // width and which Quick Capture button variant is mounted; transitions
  // between phases are chained off animation-completion callbacks so the
  // stages never overlap.
  type SidebarPhase = "expanded" | "toCircle" | "hiding" | "collapsed" | "showing" | "toDock";
  const [sidebarPhase, setSidebarPhase] = useState<SidebarPhase>("expanded");
  const sidebarCollapsed = sidebarPhase === "hiding" || sidebarPhase === "collapsed";
  const sidebarFullyCollapsed = sidebarPhase === "collapsed";
  const [sidebarFlyoutOpen, setSidebarFlyoutOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });
  const flyoutItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  // Set by the Ctrl+M handler when it has to collapse the sidebar first —
  // the phase-watching effect below opens the flyout once collapse finishes.
  const openFlyoutAfterCollapseRef = useRef(false);

  const toggleFlyout = useCallback(() => {
    setSidebarFlyoutOpen((open) => {
      if (!open && menuButtonRef.current) {
        const rect = menuButtonRef.current.getBoundingClientRect();
        setMenuAnchor({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
      return !open;
    });
  }, []);

  const toggleSidebar = () => {
    setSidebarPhase((phase) => {
      if (phase === "expanded") return "toCircle";
      if (phase === "collapsed") return "showing";
      return phase;
    });
  };

  // The single source of truth for "what kind of memory is this" — rule-based
  // for now, but isolated in lib/detect-memory-type.ts so it's a one-place
  // swap for a real AI classifier later.
  const detectedType = useMemo(
    () => detectMemoryType({ text: captureText, attachmentMimeType: captureAttachmentMimeType }),
    [captureText, captureAttachmentMimeType],
  );
  const detectedTypeLabel = detectedType === "web" ? "Website" : detectedType;
  const openCaptureModal = useCallback(() => {
    setSaveStep(1);
    setCaptureTitle("");
    setCaptureText("");
    setCaptureCollectionIds([]);
    setCaptureAttachment(null);
    setCaptureAttachmentName(null);
    setCaptureAttachmentMimeType(null);
    setSaveError(null);
    setSaveModalOpen(true);
  }, [
    setSaveStep,
    setCaptureTitle,
    setCaptureText,
    setCaptureCollectionIds,
    setCaptureAttachment,
    setCaptureAttachmentName,
    setCaptureAttachmentMimeType,
    setSaveError,
    setSaveModalOpen,
  ]);

  // Pages (e.g. Home's quick-save shortcuts) open this modal by event, so
  // they don't need a route of their own or a context just for one call.
  const openCaptureModalRef = useRef(openCaptureModal);
  useEffect(() => {
    openCaptureModalRef.current = openCaptureModal;
  });
  useEffect(() => {
    const open = () => openCaptureModalRef.current();
    window.addEventListener("capture:open", open);
    return () => window.removeEventListener("capture:open", open);
  }, []);

  // The dropzone calls this for the file it was given. A rejection's message
  // becomes the reason shown on the file's row.
  const uploadForCapture: FileDropzoneUpload = async (item) => {
    if (!item.file) return;
    if (storageLimit.isAtLimit) throw new Error(storageLimit.message ?? "You've reached your storage limit.");
    // Name and type first, so the "Saving as" line is right while it uploads.
    setCaptureAttachmentName(item.name);
    setCaptureAttachmentMimeType(item.file.type);
    setIsUploadingAttachment(true);
    try {
      setCaptureAttachment(await uploadFile(item.file));
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const clearAttachment = () => {
    setCaptureAttachment(null);
    setCaptureAttachmentName(null);
    setCaptureAttachmentMimeType(null);
  };

  // A picture pasted into the text box (a screenshot, say) is handed to the
  // dropzone as if it had been chosen there, so there is one place a file
  // shows, uploads and can be removed.
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const handleCapturePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(e.clipboardData?.items ?? []).find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
    const picker = dropzoneRef.current?.querySelector<HTMLInputElement>('input[type="file"]');
    if (!file || !picker) return;
    e.preventDefault();
    const transfer = new DataTransfer();
    transfer.items.add(file);
    picker.files = transfer.files;
    picker.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim() && !captureAttachment) return;
    if (memoryLimit.isAtLimit) {
      setSaveError(memoryLimit.message ?? "You've reached your memory limit.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const title = captureTitle.trim() || deriveTitle(detectedType, captureText, captureAttachmentName);
      // A pasted link often comes with commentary ("check this out
      // https://... thoughts?") — split it so the URL lands in `url` and
      // whatever's left becomes the caption, instead of the whole blob
      // getting shoved into the url field.
      const { url: extractedUrl, caption } = splitLinkAndCaption(captureText);
      const isLink = detectedType === "web" || detectedType === "video";
      const payload = {
        type: detectedType,
        title,
        url: isLink ? extractedUrl?.href : undefined,
        // For a note, the whole field is the content. For an attachment
        // (image/document), the field is free for a caption instead — an
        // attachment never consumes captureText, so whatever's typed there
        // should still be saved alongside the file rather than dropped. For
        // a link, whatever text was left after pulling the URL out becomes
        // the caption.
        content: detectedType === "note" || captureAttachment ? captureText.trim() || undefined : isLink ? caption || undefined : undefined,
        collectionIds: captureCollectionIds.length > 0 ? captureCollectionIds : undefined,
        attachments: captureAttachment ? [captureAttachment] : undefined,
      };
      const memory = await create(payload);
      // AI ingestion runs async in the background from here — the modal
      // doesn't wait for it. Once it finishes, the enrichment (corrected
      // caption, real title, tags, collection) shows up wherever the memory
      // is viewed next: the memories list, its detail page's "Savedly
      // Understood" panel, and the list's slide-in drawer.
      setSavedTitle(memory.title);
      setSavedCollections(memory.collections);
      setSaveStep("done");
    } catch (err) {
      // Told it's a duplicate and chose to skip: nothing went wrong.
      if (!(err instanceof DuplicateSkippedError)) setSaveError(err instanceof Error ? err.message : "Couldn't save that memory.");
    } finally {
      setIsSaving(false);
    }
  };


  // Global keyboard shortcuts. Note: Ctrl/Cmd+N and Ctrl/Cmd+P are reserved
  // by the browser itself (new window / print) in Chrome and Firefox — their
  // preventDefault() is a no-op there, so these two only actually fire in
  // browsers/contexts that don't intercept them first (still wired here on
  // the chance they do, and so the binding is correct if that ever changes).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      switch (e.key.toLowerCase()) {
        case "k":
          e.preventDefault();
          setSearchModalOpen(true);
          break;
        case "q":
          e.preventDefault();
          openCaptureModal();
          break;
        case "enter":
          if (saveModalOpen && saveStep === 1) {
            e.preventDefault();
            captureFormRef.current?.requestSubmit();
          }
          break;
        case "b":
          e.preventDefault();
          toggleSidebar();
          break;
        case "n":
          e.preventDefault();
          router.push("/app/notifications");
          break;
        case "p":
          e.preventDefault();
          router.push("/app/settings");
          break;
        // Ask-only — same two actions as the floating dock's "New
        // chat"/"Chat history" buttons (AskPage listens for these same
        // events), just reachable without needing the dock visible.
        case "j":
          if (pathname === "/app/ask") {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("ask:new-chat"));
          }
          break;
        case "h":
          if (pathname === "/app/ask") {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("ask:open-history"));
          }
          break;
        case "/":
          e.preventDefault();
          setShortcutsOpen(true);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveModalOpen, saveStep, router, openCaptureModal, toggleSidebar, pathname]);

  // Collapsed-sidebar quick-nav menu keyboard control: Ctrl+M opens/closes
  // it, Tab / Shift+Tab cycle its items, Escape closes it (Enter navigates
  // via the focused link's own native behavior). If the full sidebar is
  // still open, Ctrl+M collapses it first — the flyout doesn't exist until
  // the sidebar is fully collapsed, so it opens once that finishes (see the
  // phase-watching effect below) rather than being a no-op.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        if (sidebarFullyCollapsed) {
          toggleFlyout();
        } else if (sidebarPhase === "expanded") {
          openFlyoutAfterCollapseRef.current = true;
          toggleSidebar();
        }
        return;
      }

      if (!sidebarFullyCollapsed || !sidebarFlyoutOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setSidebarFlyoutOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (e.key === "Tab") {
        const items = flyoutItemRefs.current.filter((el): el is HTMLAnchorElement => el !== null);
        if (items.length === 0) return;
        e.preventDefault();
        const currentIndex = items.indexOf(document.activeElement as HTMLAnchorElement);
        const delta = e.shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + delta + items.length) % items.length;
        items[nextIndex]?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarFullyCollapsed, sidebarFlyoutOpen, sidebarPhase, toggleFlyout, toggleSidebar]);

  // Once a Ctrl+M-triggered collapse finishes, open the flyout it was
  // waiting on.
  useEffect(() => {
    if (sidebarFullyCollapsed && openFlyoutAfterCollapseRef.current) {
      openFlyoutAfterCollapseRef.current = false;
      toggleFlyout();
    }
  }, [sidebarFullyCollapsed, toggleFlyout]);

  // Focus the first item as soon as the menu opens, so Tab/Shift+Tab have
  // somewhere to start cycling from.
  useEffect(() => {
    if (sidebarFlyoutOpen && sidebarFullyCollapsed) {
      flyoutItemRefs.current[0]?.focus();
    }
  }, [sidebarFlyoutOpen, sidebarFullyCollapsed]);

  const planLabel = usePlanLabel();
  const unreadCount = useUnreadCountQuery().data?.count ?? 0;

  const primaryNavItems: NavItem[] = [
    { label: "Home", href: "/app", icon: Compass },
    { label: "Search", href: "/app/search", icon: Search },
    { label: "Ask Savedly", href: "/app/ask", icon: Sparkles, logo: true },
    { label: "Memories", href: "/app/memories", icon: FolderOpen },
    { label: "Collections", href: "/app/collections", icon: Layers },
    { label: "Tags", href: "/app/tags", icon: Tag },
  ];
  // The rest of the app, grouped by what the visitor is doing: getting back
  // to things they kept, looking at their library from above, or setting up.
  const navSections: { id: string; label: string; items: NavItem[] }[] = [
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
        { label: "Explore", href: "/app/explore", icon: CompassIcon },
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

  // What the command palette offers: a few actions, then every page the
  // sidebar links to. `commandActions` holds what each one does, by id.
  const platform = usePlatform();
  const keys = (shortcut: string) => formatShortcut(shortcut, platform).text;
  const paletteIcon = (icon: IconSvgElement) => <HugeiconsIcon icon={icon} strokeWidth={2} className="h-4 w-4" />;
  const pageItems = [...primaryNavItems, ...secondaryNavItems, { label: "Settings", href: "/app/settings", icon: Settings }];
  const commandItems: PaletteItem[] = [
    { id: "capture", group: "Actions", label: "Save something", description: "A link, a note or a file", keywords: ["new", "add", "memory", "capture", "quick"], icon: paletteIcon(Plus), shortcut: keys("mod+q") },
    { id: "ask", group: "Actions", label: "Ask Savedly", description: "Get an answer from what you saved", keywords: ["chat", "question", "ai"], icon: <LogoMark ticks={false} className="h-4 w-4" /> },
    { id: "new-collection", group: "Actions", label: "New collection", keywords: ["create", "folder", "group"], icon: paletteIcon(FolderPlus) },
    { id: "toggle-sidebar", group: "Actions", label: "Show or hide the sidebar", keywords: ["collapse", "expand", "menu"], icon: paletteIcon(PanelLeftClose), shortcut: keys("mod+b") },
    { id: "shortcuts", group: "Actions", label: "Keyboard shortcuts", keywords: ["keys", "help", "hotkeys"], icon: paletteIcon(Keyboard), shortcut: keys("mod+/") },
    ...pageItems
      // "Ask Savedly" is already an action above.
      .filter((item) => item.href !== "/app/ask")
      .map((item) => ({ id: `go:${item.href}`, group: "Go to", label: item.label, keywords: ["open", "page"], icon: paletteIcon(item.icon) })),
  ];
  const commandActions: Record<string, () => void> = {
    capture: openCaptureModal,
    ask: () => router.push("/app/ask"),
    "new-collection": () => router.push("/app/collections"),
    "toggle-sidebar": toggleSidebar,
    shortcuts: () => setShortcutsOpen(true),
    ...Object.fromEntries(pageItems.map((item) => [`go:${item.href}`, () => router.push(item.href)])),
  };
  const renderSection = (section: (typeof navSections)[number]) => (
    <SidebarSection
      key={section.id}
      label={section.label}
      open={!closedSections.includes(section.id)}
      onToggle={() => toggleSection(section.id)}
    >
      {section.items.map((item) => (
        <SidebarLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} />
      ))}
    </SidebarSection>
  );
  const visibleCollections = collectionsShowAll ? collections : collections.slice(0, COLLECTIONS_PREVIEW_COUNT);

  return (
    <NextStepProvider>
      <NextStep steps={productTourSteps} navigationAdapter={useNextAdapter} cardComponent={TourCard}>
        <TourAutoStart userId={currentUser.id} />
        <AccentColor />
        <div className="flex h-dvh w-screen bg-background text-foreground font-sans overflow-hidden transition-colors duration-300">

      {/* Ambient primary-color glow — decorative, sits behind everything else */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-[110px] animate-ambient-flash" />
        <div className="absolute -bottom-48 -right-24 h-[30rem] w-[30rem] rounded-full bg-primary/[0.07] blur-[130px] animate-ambient-flash [animation-delay:-9s]" />
      </div>

      {/* 1. DESKTOP SIDEBAR */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 0 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        onAnimationComplete={() => {
          setSidebarPhase((phase) => {
            if (phase === "hiding") return "collapsed";
            if (phase === "showing") return "toDock";
            return phase;
          });
        }}
        className={cn(
          "relative z-10 bg-muted/15 flex flex-col justify-between shrink-0 hidden md:flex overflow-hidden",
          sidebarCollapsed ? "border-r-0" : "border-r border-border/60"
        )}
      >
        <div className="flex flex-col min-h-0 flex-1 w-60">

          {/* Header + Quick Capture — fixed, never scrolls with the nav below */}
          <div className="px-3 pt-5 pb-3 space-y-4 shrink-0">
            <Link href="/app" className="flex items-center gap-2 px-3 hover:opacity-85 transition-opacity">
              <Logo className="text-[15px]" />
            </Link>

            {sidebarPhase === "expanded" && (
              <motion.button
                layoutId="quick-capture-fab"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                onClick={openCaptureModal}
                data-tour="quick-capture-btn"
                title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
                className="relative w-full h-10 rounded-full font-semibold text-[13px] bg-primary text-primary-foreground flex items-center justify-center gap-1.5 shadow-sm"
              >
                <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" /> Quick Capture
                {memoryLimit.isAtLimit && <LimitDot />}
              </motion.button>
            )}

            {/* Stage 1 (collapsing): morphs from the pill above into this
                docked circle before the sidebar starts hiding. Stage 3
                (expanding): this is where the floating circle slides back
                to before morphing into the pill again. */}
            {(sidebarPhase === "toCircle" || sidebarPhase === "hiding" || sidebarPhase === "toDock") && (
              <motion.button
                layoutId="quick-capture-fab"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                onClick={openCaptureModal}
                onLayoutAnimationComplete={() => {
                  setSidebarPhase((phase) => {
                    if (phase === "toCircle") return "hiding";
                    if (phase === "toDock") return "expanded";
                    return phase;
                  });
                }}
                title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
                className="relative h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm shrink-0"
                aria-label="Quick Capture (Ctrl+Q)"
              >
                <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" />
                {memoryLimit.isAtLimit && <LimitDot />}
              </motion.button>
            )}
          </div>

        <ScrollArea className="flex-1 min-h-0">
        <GlidingHighlight aria-label="Main" className="px-3 pb-5 space-y-5">

          <div className="space-y-0.5">
            {primaryNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isNavItemActive(pathname, item.href)}
                data-tour={item.href === "/app/memories" ? "nav-memories" : undefined}
              />
            ))}
          </div>

          {navSections.slice(0, 1).map(renderSection)}

          <SidebarSection
            label="Collections"
            open={!closedSections.includes("collections")}
            onToggle={() => toggleSection("collections")}
            action={
              <Link
                href="/app/collections"
                aria-label="New collection"
                title="New collection"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={Plus} strokeWidth={2} className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {collections.length === 0 ? (
              <p className="px-3 py-1.5 text-[13px] leading-snug text-muted-foreground">
                Group related saves.{" "}
                <Link href="/app/collections" className="font-medium text-primary hover:underline">Create one</Link>
              </p>
            ) : (
              <>
                {visibleCollections.map((col) => {
                  const href = `/app/collections/${col.id}`;
                  const active = isNavItemActive(pathname, href);
                  return (
                    <Link
                      key={col.id}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      data-nav-row=""
                      className={cn(
                        SIDEBAR_ROW,
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span aria-hidden className="flex w-[18px] shrink-0 justify-center text-sm leading-none">{col.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{col.name}</span>
                      {col.memoryCount > 0 && (
                        <span className="text-[11px] tabular-nums text-muted-foreground/70">{col.memoryCount}</span>
                      )}
                    </Link>
                  );
                })}
                {collections.length > COLLECTIONS_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setCollectionsShowAll((show) => !show)}
                    data-nav-row=""
                    className="relative z-[1] flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="flex w-[18px] justify-center">
                      <HugeiconsIcon icon={ChevronDown} strokeWidth={2} className={cn("h-3.5 w-3.5 transition-transform duration-200", collectionsShowAll && "rotate-180")} />
                    </span>
                    {collectionsShowAll ? "Show less" : `${collections.length - COLLECTIONS_PREVIEW_COUNT} more`}
                  </button>
                )}
              </>
            )}
          </SidebarSection>

          {navSections.slice(1).map(renderSection)}

        </GlidingHighlight>
        </ScrollArea>

        </div>

        {/* Sidebar Bottom user profile */}
        <div className="relative w-60 border-t border-border/40 p-3">
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
                <button type="button" role="menuitem" onClick={() => { setUserDropdownOpen(false); setShortcutsOpen(true); }} className={PROFILE_MENU_ITEM}>
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

      </motion.aside>

      {/* 2. TOPBAR AND MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">

        {/* Topbar Header */}
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
              onClick={() => setSearchModalOpen(true)}
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

        {/* Main nested content render */}
        <main className="flex-1 min-h-0">
          <ScrollArea className="h-full" viewportClassName="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            <SidebarStateProvider value={{ collapsed: sidebarCollapsed, fullyCollapsed: sidebarFullyCollapsed }}>
              <SetupPanel />
              {children}
            </SidebarStateProvider>
          </ScrollArea>
        </main>

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
            onClick={openCaptureModal}
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
                <p className="truncate text-xs text-muted-foreground">{planLabel.label} plan</p>
              </div>
            </div>

            <nav aria-label="All sections" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
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
                        className={cn(MOBILE_MENU_ROW, active ? "bg-primary/10 text-primary" : "text-foreground active:bg-muted")}
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
              <button type="button" onClick={() => { setMobileMenuOpen(false); handleLogout(); }} className={cn(MOBILE_MENU_ROW, "w-full text-left text-destructive active:bg-destructive/10")}>
                <span className="w-5 shrink-0" />
                Log out
              </button>
            </div>
          </SheetContent>
        </Sheet>

      </div>

      {/* GLOBAL QUICK CAPTURE MODAL. A dialog on a desktop and a bottom
          sheet on a phone (ResponsiveDialog), holding Arc's fields: a textarea, a file dropzone, an input and
          a button that shows its own "saving" state. */}
      <ResponsiveDialog
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        title={saveStep === "done" ? "Saved" : "Add to Savedly"}
        description="Save a link, a note or a file to your library."
        hideDescription
        className="sm:max-w-lg"
      >

          <AnimatePresence mode="wait" initial={false}>
            {saveStep === 1 && (
              <motion.form
                key="form"
                ref={captureFormRef}
                onSubmit={handleCaptureSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <ArcTextarea
                  label="What do you want to save?"
                  autoFocus
                  rows={4}
                  value={captureText}
                  onChange={(e) => setCaptureText(e.target.value)}
                  onPaste={handleCapturePaste}
                  placeholder="Paste a link, or write a note"
                  // Says what Savedly takes it to be, and changes as you type.
                  description={captureText.trim() || captureAttachment ? `Saving as: ${detectedTypeLabel === "Website" ? "website" : detectedTypeLabel}` : undefined}
                />

                {/* One file per save. A picture pasted into the box above lands here too. */}
                <div ref={dropzoneRef}>
                  <FileDropzone
                    multiple={false}
                    maxFiles={1}
                    label="Attach a file"
                    description="Drop it here, paste it, or choose from your device"
                    note="An image, PDF or document"
                    listPlacement="inside"
                    compactAt={1}
                    onUpload={uploadForCapture}
                    onFilesChange={(files) => {
                      if (files.length === 0) clearAttachment();
                    }}
                  />
                </div>

                <ArcInput
                  label="Title"
                  placeholder="Optional. One is written for you if you leave this empty"
                  value={captureTitle}
                  onChange={(e) => setCaptureTitle(e.target.value)}
                />

                <CaptureCollectionPicker collections={collections} selectedIds={captureCollectionIds} onChange={setCaptureCollectionIds} />

                {memoryLimit.isAtLimit ? (
                  <PlanLimitNotice message={memoryLimit.message ?? "You've reached your memory limit."} />
                ) : (
                  saveError && (
                    <p role="alert" className="text-sm text-destructive">
                      {saveError}
                    </p>
                  )
                )}

                <ArcButton
                  type="submit"
                  size="lg"
                  loading={isSaving}
                  disabled={isUploadingAttachment || memoryLimit.isAtLimit || (!captureText.trim() && !captureAttachment)}
                  title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
                  className="w-full"
                >
                  {memoryLimit.isAtLimit ? "Limit reached" : isUploadingAttachment ? "Uploading the file…" : "Save"}
                </ArcButton>
              </motion.form>
            )}

            {saveStep === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 py-3 text-center"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <HugeiconsIcon icon={Check} strokeWidth={2.5} className="h-5 w-5" />
                </div>

                <div className="space-y-1">
                  <p className="text-base font-medium text-balance text-foreground">{savedTitle}</p>
                  <p className="text-sm text-muted-foreground">It&apos;s in your library. A summary and tags are added in a moment.</p>
                </div>

                {savedCollections.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {savedCollections.map((c) => (
                      <Link key={c.id} href={`/app/collections/${c.id}`} onClick={() => setSaveModalOpen(false)}>
                        <ArcBadge tone="info" size="sm">
                          {c.name}
                        </ArcBadge>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <ArcButton variant="secondary" className="flex-1" onClick={openCaptureModal}>
                    Save another
                  </ArcButton>
                  <ArcButton
                    className="flex-1"
                    onClick={() => {
                      setSaveModalOpen(false);
                      router.push("/app/memories");
                    }}
                  >
                    View memories
                  </ArcButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </ResponsiveDialog>

      {/* Floating dock — replaces the collapsed sidebar, docked at the
          left-center of the screen like a desktop app dock. */}
      {(sidebarFullyCollapsed || sidebarPhase === "showing") && (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-1.5 p-1.5 rounded-full bg-card/95 border border-border/60 shadow-lg backdrop-blur-sm">
          {sidebarFullyCollapsed && (
            <button
              ref={menuButtonRef}
              type="button"
              onClick={toggleFlyout}
              className="h-10 w-10 rounded-full border border-primary/30 bg-primary/10 text-primary shadow-sm flex items-center justify-center hover:bg-primary/15 transition-colors shrink-0"
              aria-label="Open sidebar menu (Ctrl+M)"
            >
              <HugeiconsIcon icon={Menu} strokeWidth={2.25} className="h-4 w-4" />
            </button>
          )}

          {/* Shares layoutId with the sidebar's Quick Capture button so it
              smoothly morphs between the two on collapse/expand. Stays
              mounted through "showing" too so it's still there to slide
              back to dock. */}
          {(sidebarPhase === "collapsed" || sidebarPhase === "showing") && (
            <motion.button
              layoutId="quick-capture-fab"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              type="button"
              onClick={openCaptureModal}
              title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
              className="relative h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-sm flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
              aria-label="Quick Capture (Ctrl+Q)"
            >
              <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" />
              {memoryLimit.isAtLimit && <LimitDot />}
            </motion.button>
          )}

          {/* Ask's own thread history normally lives in its on-page sidebar,
              but that sidebar has nowhere to dock once the main nav is fully
              collapsed — it was rendering flush against this floating dock
              instead. These two just dispatch events; AskPage (mounted as
              `children`) owns the actual new-chat/history logic and can't be
              called directly from here across the layout boundary. */}
          {sidebarFullyCollapsed && pathname === "/app/ask" && (
            <>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("ask:new-chat"))}
                className="h-10 w-10 rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors shrink-0"
                aria-label="New chat (Ctrl+J)"
              >
                <HugeiconsIcon icon={MessageSquarePlus} strokeWidth={2.25} className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("ask:open-history"))}
                className="h-10 w-10 rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors shrink-0"
                aria-label="Chat history (Ctrl+H)"
              >
                <HugeiconsIcon icon={History} strokeWidth={2.25} className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}

      {/* COLLAPSED SIDEBAR QUICK-NAV FLYOUT — pops off the menu button in a
          half-circle arc instead of a straight list. */}
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

      {/* GLOBAL SEARCH COMMAND PALETTE (⌘K) */}
      {/* The command palette (Ctrl/⌘+K). */}
      <PaletteDialog
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        title="Search pages and actions"
        description="Type to find a page or an action, then press Enter."
        placeholder="Search or jump to…"
        items={commandItems}
        onSelect={(item) => commandActions[item.id]?.()}
      />

      {/* KEYBOARD SHORTCUTS DIALOG */}
      <ResponsiveDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        title="Keyboard shortcuts"
        description="Search for one, or hold a key to see what it does."
        className="sm:max-w-xl"
      >
        {/* Arc's cheatsheet: searchable, grouped, keys drawn for this person's
            platform. On a desktop the list scrolls inside the dialog on a short screen. */}
        <div className="md:-mx-1 md:max-h-[min(60vh,28rem)] md:overflow-y-auto md:px-1">
          <ShortcutList groups={KEYBOARD_SHORTCUTS} />
        </div>
      </ResponsiveDialog>

      {eventPopupNotification && (
        <LiveEventDetectedPopup
          notification={eventPopupNotification}
          onClose={() => setEventPopupNotification(null)}
        />
      )}

      {duplicatePopup && <LiveDuplicatePopup notification={duplicatePopup} onClose={() => setDuplicatePopup(null)} />}
      <DuplicateAskHost />

      <AskWidget />

      {/* Global CSS animations styles */}
      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-up {
          animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes ambientFlash {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .animate-ambient-flash {
          animation: ambientFlash 18s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-ambient-flash {
            animation: none;
          }
        }
      `}</style>

        </div>
      </NextStep>
    </NextStepProvider>
  );
}
