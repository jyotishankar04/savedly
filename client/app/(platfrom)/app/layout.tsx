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
import { SparklesIcon as Sparkles, PlusIcon as Plus, Search01Icon as Search, Settings01Icon as Settings, HelpCircleIcon as HelpCircle, BellIcon as Bell, XIcon as X, MoonIcon as Moon, Sun01Icon as Sun, FolderOpenIcon as FolderOpen, CompassIcon as Compass, CheckIcon as Check, ChevronDownIcon as ChevronDown, FolderPlusIcon as FolderPlus, HeartIcon as Heart, Clock01Icon as Clock, CompassIcon, BarChartIcon as BarChart2, FileTextIcon as FileText, PaperclipIcon as Paperclip, CloudUploadIcon as UploadCloud, Layers01Icon as Layers, PanelLeftCloseIcon as PanelLeftClose, PanelLeftOpenIcon as PanelLeftOpen, Menu01Icon as Menu, Tag01Icon as Tag, KeyboardIcon as Keyboard, Archive01Icon as Archive, Delete02Icon as Trash2, TrendingUpIcon as TrendingUp, Plug01Icon as Plug, MessageSquarePlusIcon as MessageSquarePlus, HistoryIcon as History, ShieldUserIcon as ShieldUser, Share02Icon as Share2, LockPasswordIcon as VaultIcon, Calendar03Icon as CalendarIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { UserAvatar, UserProvider, useUser, useCurrentUserQuery, useSetCurrentUser } from "@/context/UserContext";
import { useMemories } from "@/context/MemoryContext";
import { SidebarStateProvider } from "@/context/SidebarContext";
import { uploadFile, type UploadedFile } from "@/lib/uploads";
import { usePlanLabel, usePlanLimit } from "@/hooks/use-plan-limit";
import { useRecentEventNotificationsQuery, useUnreadCountQuery } from "@/hooks/use-notifications";
import type { AppNotification } from "@/lib/notifications";
import type { Collection } from "@/types/memory";
import { EventDetectedPopup } from "@/components/memory/event-detected-popup";
import { useLockVaultMutation } from "@/hooks/use-vault";
import { PlanLimitNotice, ProBadge, LimitDot } from "@/components/plan-limit-notice";
import { detectMemoryType, deriveTitle, splitLinkAndCaption } from "@/lib/detect-memory-type";
import { MEMORY_TYPE_ICONS } from "@/lib/memory-icons";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/toast";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Logo, LogoMark } from "@/components/logo";
import { NextStepProvider, NextStep } from "nextstepjs";
import { useNextAdapter } from "nextstepjs/adapters/next";
import { productTourSteps, TourCard, TourAutoStart } from "@/components/product-tour";
import { AskWidget } from "@/components/ask-widget/ask-widget";

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
  "flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const PROFILE_MENU_ITEM =
  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none";

function SidebarLink({ item, active, ...rest }: { item: NavItem; active: boolean; "data-tour"?: string }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      {...rest}
      className={cn(
        SIDEBAR_ROW,
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
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
function CaptureCollectionPicker({
  collections,
  selectedIds,
  onChange,
}: {
  collections: Collection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = collections.filter((c) => selectedIds.includes(c.id));
  const sorted = [...collections].sort((a, b) => a.name.localeCompare(b.name));

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <div className="space-y-2">
      <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Collections</span>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => toggle(col.id)}
              className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
            >
              <span aria-hidden>{col.icon}</span>
              {col.name}
              <HugeiconsIcon icon={X} strokeWidth={2.5} className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {collections.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No collections yet.</p>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className="flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <HugeiconsIcon icon={FolderOpen} strokeWidth={2} className="h-3.5 w-3.5" />
            {selected.length > 0 ? "Add another" : "Choose collections"}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 max-w-[calc(100vw-3rem)] p-0">
            <Command>
              <CommandInput placeholder="Find a collection…" className="text-sm" />
              <CommandList className="max-h-64">
                <CommandEmpty className="text-sm text-muted-foreground">No collection with that name.</CommandEmpty>
                <CommandGroup>
                  {sorted.map((col) => {
                    const isSelected = selectedIds.includes(col.id);
                    return (
                      <CommandItem key={col.id} value={`${col.name} ${col.id}`} data-checked={isSelected} onSelect={() => toggle(col.id)} title={col.name} className="py-2 text-sm">
                        <span aria-hidden className="w-5 shrink-0 text-center">{col.icon}</span>
                        <span className="min-w-0 flex-1 truncate">{col.name}</span>
                        {isSelected && <HugeiconsIcon icon={Check} strokeWidth={2.5} className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

const KEYBOARD_SHORTCUTS: { mac: string[]; other: string[]; label: string }[] = [
  { mac: ["⌘", "K"], other: ["Ctrl", "K"], label: "Open search" },
  { mac: ["⌘", "Q"], other: ["Ctrl", "Q"], label: "Quick capture" },
  { mac: ["⌘", "B"], other: ["Ctrl", "B"], label: "Toggle sidebar" },
  { mac: ["⌘", "M"], other: ["Ctrl", "M"], label: "Open sidebar menu (collapses sidebar first)" },
  { mac: ["⌘", "N"], other: ["Ctrl", "N"], label: "Go to notifications" },
  { mac: ["⌘", "P"], other: ["Ctrl", "P"], label: "Go to settings" },
  { mac: ["⌘", "J"], other: ["Ctrl", "J"], label: "New chat (on Ask SaveForLatter)" },
  { mac: ["⌘", "H"], other: ["Ctrl", "H"], label: "Open chat history (on Ask SaveForLatter)" },
  { mac: ["⌘", "/"], other: ["Ctrl", "/"], label: "Show keyboard shortcuts" },
  { mac: ["Esc"], other: ["Esc"], label: "Close open menu" },
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
  const { data: recentNotifications } = useRecentEventNotificationsQuery();
  const seenEventPopupIds = useRef<Set<string>>(new Set());
  const [eventPopupNotification, setEventPopupNotification] = useState<AppNotification | null>(null);
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
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureFormRef = useRef<HTMLFormElement>(null);
  const [savedTitle, setSavedTitle] = useState("");
  const [savedCollections, setSavedCollections] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
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
  const DetectedTypeIcon = MEMORY_TYPE_ICONS[detectedType];
  const detectedTypeLabel = detectedType === "web" ? "Website" : detectedType;

  const openCaptureModal = () => {
    setSaveStep(1);
    setCaptureTitle("");
    setCaptureText("");
    setCaptureCollectionIds([]);
    setCaptureAttachment(null);
    setCaptureAttachmentName(null);
    setCaptureAttachmentMimeType(null);
    setAttachmentError(null);
    setSaveError(null);
    setIsDraggingOver(false);
    dragCounter.current = 0;
    setSaveModalOpen(true);
  };

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

  const handleFileUpload = async (file: File) => {
    if (storageLimit.isAtLimit) {
      setAttachmentError(storageLimit.message ?? "You've reached your storage limit.");
      return;
    }
    // Set the name/mime immediately so the Attachment preview (with its
    // shimmer) can show the real filename and the right icon while the
    // upload is still in flight, not just once it resolves.
    setCaptureAttachmentName(file.name);
    setCaptureAttachmentMimeType(file.type);
    setIsUploadingAttachment(true);
    setAttachmentError(null);
    try {
      const uploaded = await uploadFile(file);
      setCaptureAttachment(uploaded);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFileUpload(file);
  };

  const clearAttachment = () => {
    setCaptureAttachment(null);
    setCaptureAttachmentName(null);
    setCaptureAttachmentMimeType(null);
    setAttachmentError(null);
  };

  const handleCapturePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) void handleFileUpload(file);
        return;
      }
    }
  };

  const handleCaptureDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDraggingOver(true);
  };

  const handleCaptureDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) setIsDraggingOver(false);
  };

  const handleCaptureDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFileUpload(file);
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
      // is viewed next: the memories list, its detail page's "SaveForLatter
      // Understood" panel, and the list's slide-in drawer.
      setSavedTitle(memory.title);
      setSavedCollections(memory.collections);
      setSaveStep("done");
      // Non-blocking duplicate hint (docs/URL_CAPTURE_AND_PREVIEW.md) — the
      // memory above was saved either way, this is just a heads-up.
      if (memory.duplicateOf) {
        toast.add({
          title: "You already saved a similar link",
          description: memory.duplicateOf.title,
          type: "info",
        });
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save that memory.");
    } finally {
      setIsSaving(false);
    }
  };

  // Command palette search query
  const [commandQuery, setCommandQuery] = useState("");

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
    { label: "Ask SaveForLatter", href: "/app/ask", icon: Sparkles, logo: true },
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
        <div className="flex h-screen w-screen bg-background text-foreground font-sans overflow-hidden transition-colors duration-300">

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
                className="relative w-full h-10 rounded-full font-semibold text-[13px] bg-primary text-white flex items-center justify-center gap-1.5 shadow-sm"
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
                className="relative h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow-sm shrink-0"
                aria-label="Quick Capture (Ctrl+Q)"
              >
                <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-4 w-4" />
                {memoryLimit.isAtLimit && <LimitDot />}
              </motion.button>
            )}
          </div>

        <ScrollArea className="flex-1 min-h-0">
        <nav aria-label="Main" className="px-3 pb-5 space-y-5">

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
                      className={cn(
                        SIDEBAR_ROW,
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
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
                    className="flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
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

        </nav>
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
          <ScrollArea className="h-full" viewportClassName="pb-16 md:pb-0">
            <SidebarStateProvider value={{ collapsed: sidebarCollapsed, fullyCollapsed: sidebarFullyCollapsed }}>
              {children}
            </SidebarStateProvider>
          </ScrollArea>
        </main>

        {/* 3. MOBILE BOTTOM NAVIGATION BAR */}
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around z-40 md:hidden px-4">
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
            className="relative h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg -translate-y-2 select-none"
          >
            <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="h-6 w-6 stroke-[2.5]" />
            {memoryLimit.isAtLimit && <LimitDot />}
          </button>

          <Link href="/app/ask" className={cn("flex flex-col items-center gap-0.5 text-[9px] font-bold", isNavItemActive(pathname, "/app/ask") ? "text-primary" : "text-muted-foreground")}>
            <LogoMark ticks={false} className="h-5 w-5" />
            <span>Ask</span>
          </Link>

          <Link href="/app/settings" className={cn("flex flex-col items-center gap-0.5 text-[9px] font-bold", isNavItemActive(pathname, "/app/settings") ? "text-primary" : "text-muted-foreground")}>
            <HugeiconsIcon icon={Settings} strokeWidth={2.25} className="h-5 w-5" />
            <span>You</span>
          </Link>
        </nav>

      </div>

      {/* GLOBAL QUICK CAPTURE MODAL */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-5 animate-scale-up">

            <div className="flex items-center justify-between border-b border-border/20 pb-2">
              <span className="text-xs font-bold text-foreground">Add to SaveForLatter</span>
              <button onClick={() => setSaveModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <HugeiconsIcon icon={X} strokeWidth={2.25} className="h-4 w-4" />
              </button>
            </div>

            {saveStep === 1 && (
              <form ref={captureFormRef} onSubmit={handleCaptureSubmit} className="space-y-4">

                {/* Unified capture surface — paste a link, paste/drop a file, or just type */}
                <div className="relative">
                  {isDraggingOver && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-background/90 backdrop-blur-sm">
                      <HugeiconsIcon icon={UploadCloud} strokeWidth={2.25} className="h-5 w-5 text-primary" />
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Drop to attach</p>
                    </div>
                  )}

                  <InputGroup
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={handleCaptureDragEnter}
                    onDragLeave={handleCaptureDragLeave}
                    onDrop={handleCaptureDrop}
                    className={cn(
                      "h-auto rounded-2xl border-2 bg-muted/10 transition-colors",
                      isDraggingOver ? "border-primary/70" : "border-border/60"
                    )}
                  >
                    <InputGroupTextarea
                      autoFocus
                      value={captureText}
                      onChange={(e) => setCaptureText(e.target.value)}
                      onPaste={handleCapturePaste}
                      placeholder="Paste a link, drop a file, or start typing a note..."
                      rows={captureAttachment || isUploadingAttachment ? 3 : 5}
                      className="px-4 py-3.5 text-sm placeholder:text-muted-foreground/70"
                    />

                    {(isUploadingAttachment || captureAttachment || attachmentError) && (
                      <InputGroupAddon align="block-start" className="w-full justify-start px-3 pb-1">
                        <Attachment
                          state={attachmentError ? "error" : isUploadingAttachment ? "uploading" : "done"}
                          size="sm"
                          className="w-full max-w-full border-border/60 bg-background/70"
                        >
                          <AttachmentMedia variant={captureAttachmentMimeType?.startsWith("image/") ? "image" : "icon"}>
                            {captureAttachmentMimeType?.startsWith("image/") && captureAttachment ? (
                              // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain preview image
                              <img src={captureAttachment.fileUrl} alt="" />
                            ) : (
                              <HugeiconsIcon icon={FileText} strokeWidth={2.25} />
                            )}
                          </AttachmentMedia>
                          <AttachmentContent>
                            <AttachmentTitle>{captureAttachmentName ?? "Attachment"}</AttachmentTitle>
                            <AttachmentDescription>
                              {attachmentError ??
                                (isUploadingAttachment
                                  ? "Uploading…"
                                  : captureAttachment
                                    ? `${(captureAttachment.fileSize / 1024).toFixed(0)} KB`
                                    : "")}
                            </AttachmentDescription>
                          </AttachmentContent>
                          <AttachmentActions>
                            <AttachmentAction type="button" aria-label={`Remove ${captureAttachmentName ?? "attachment"}`} onClick={clearAttachment}>
                              <HugeiconsIcon icon={X} strokeWidth={2.25} />
                            </AttachmentAction>
                          </AttachmentActions>
                        </Attachment>
                      </InputGroupAddon>
                    )}

                    <InputGroupAddon align="block-end" className="w-full justify-between border-t border-border/40 bg-muted/20 px-3 py-2">
                      <InputGroupButton
                        type="button"
                        disabled={storageLimit.isAtLimit}
                        title={storageLimit.isAtLimit ? storageLimit.message ?? undefined : undefined}
                        onClick={() => fileInputRef.current?.click()}
                        className={storageLimit.isAtLimit ? "opacity-50 cursor-not-allowed" : undefined}
                      >
                        <HugeiconsIcon icon={Paperclip} strokeWidth={2.25} className="h-3.5 w-3.5" />
                        Attach
                        {storageLimit.isAtLimit && <ProBadge className="ml-1" />}
                      </InputGroupButton>

                      <InputGroupText className="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-primary">
                        <HugeiconsIcon icon={DetectedTypeIcon} strokeWidth={2.25} className="h-3 w-3" />
                        {detectedTypeLabel}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>

                  <input ref={fileInputRef} type="file" onChange={handleAttachmentSelect} className="hidden" />
                </div>

                <Input
                  type="text"
                  placeholder="Add a title (optional)"
                  value={captureTitle}
                  onChange={(e) => setCaptureTitle(e.target.value)}
                  className="h-auto w-full rounded-xl border-input bg-background px-4 py-3 text-xs text-foreground focus-visible:border-primary/80 focus-visible:ring-primary/20"
                />

                <CaptureCollectionPicker
                  collections={collections}
                  selectedIds={captureCollectionIds}
                  onChange={setCaptureCollectionIds}
                />

                {memoryLimit.isAtLimit ? (
                  <PlanLimitNotice message={memoryLimit.message ?? "You've reached your memory limit."} />
                ) : (
                  saveError && <p className="text-[10px] text-red-500">{saveError}</p>
                )}

                <Button
                  type="submit"
                  disabled={isSaving || isUploadingAttachment || memoryLimit.isAtLimit || (!captureText.trim() && !captureAttachment)}
                  title={memoryLimit.isAtLimit ? memoryLimit.message ?? undefined : undefined}
                  className={cn(
                    "w-full h-11 rounded-full font-bold text-xs bg-primary text-white",
                    memoryLimit.isAtLimit && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {isSaving ? "Saving..." : memoryLimit.isAtLimit ? (
                    <span className="flex items-center justify-center gap-1.5">
                      Limit reached <ProBadge />
                    </span>
                  ) : (
                    "Save Memory"
                  )}
                </Button>
              </form>
            )}

            {saveStep === "done" && (
              <div className="text-center py-6 space-y-4">
                <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <HugeiconsIcon icon={Check} strokeWidth={2.25} className="h-5 w-5 stroke-[3]" />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest block">Saved to SaveForLatter</span>
                  <h4 className="text-xs font-bold text-foreground">{savedTitle}</h4>
                </div>

                {savedCollections.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {savedCollections.map((c) => (
                      <Link
                        key={c.id}
                        href={`/app/collections/${c.id}`}
                        onClick={() => setSaveModalOpen(false)}
                        className="text-[8px] font-bold uppercase bg-primary/5 border border-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/10 transition-colors"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="pt-4 flex gap-2">
                  <Button onClick={() => { setSaveModalOpen(false); router.push("/app/memories"); }} className="flex-1 h-10 rounded-full text-xs font-bold bg-primary text-white">
                    View memory &rarr;
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

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
              className="relative h-10 w-10 rounded-full bg-primary text-white shadow-sm flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
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
      <CommandDialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <CommandInput
          placeholder="Search or jump to..."
          value={commandQuery}
          onValueChange={setCommandQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => { setSearchModalOpen(false); openCaptureModal(); }}>
              <HugeiconsIcon icon={Plus} strokeWidth={2.25} className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <span>Save a memory</span>
            </CommandItem>
            <CommandItem onSelect={() => { setSearchModalOpen(false); router.push("/app/ask"); }}>
              <LogoMark ticks={false} className="mr-2 h-3.5 w-3.5" />
              <span>Ask SaveForLatter</span>
            </CommandItem>
            <CommandItem onSelect={() => { setSearchModalOpen(false); router.push("/app/collections"); }}>
              <HugeiconsIcon icon={FolderPlus} strokeWidth={2.25} className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <span>Create collection</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Go to">
            <CommandItem onSelect={() => { setSearchModalOpen(false); router.push("/app"); }}>
              <HugeiconsIcon icon={Compass} strokeWidth={2.25} className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <span>Go to Home</span>
            </CommandItem>
            <CommandItem onSelect={() => { setSearchModalOpen(false); router.push("/app/memories"); }}>
              <HugeiconsIcon icon={FolderOpen} strokeWidth={2.25} className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <span>Go to Memories</span>
            </CommandItem>
            <CommandItem onSelect={() => { setSearchModalOpen(false); router.push("/app/favorites"); }}>
              <HugeiconsIcon icon={Heart} strokeWidth={2.25} className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <span>Go to Favorites</span>
            </CommandItem>
            <CommandItem onSelect={() => { setSearchModalOpen(false); router.push("/app/settings"); }}>
              <HugeiconsIcon icon={Settings} strokeWidth={2.25} className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <span>Go to Settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* KEYBOARD SHORTCUTS DIALOG */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Available anywhere in the app.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 pt-1">
            {KEYBOARD_SHORTCUTS.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">{s.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <KbdGroup>
                    {s.mac.map((k, i) => (
                      <Kbd key={i}>{k}</Kbd>
                    ))}
                  </KbdGroup>
                  {s.mac.join("") !== s.other.join("") && (
                    <>
                      <span className="text-muted-foreground/50">/</span>
                      <KbdGroup>
                        {s.other.map((k, i) => (
                          <Kbd key={i}>{k}</Kbd>
                        ))}
                      </KbdGroup>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {eventPopupNotification && (
        <EventDetectedPopup
          notification={eventPopupNotification}
          onClose={() => setEventPopupNotification(null)}
        />
      )}

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
