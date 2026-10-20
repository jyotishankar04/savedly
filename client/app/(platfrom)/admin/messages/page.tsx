"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Archive02Icon as ArchiveIcon,
  ArrowLeft01Icon as BackIcon,
  Bug01Icon as BugIcon,
  CheckmarkCircle02Icon as DoneIcon,
  Delete02Icon as Trash,
  Idea01Icon as IdeaIcon,
  InboxIcon,
  LinkSquare02Icon as LinkOut,
  Mail01Icon as Mail,
  MailOpen01Icon as MarkUnread,
  MailReply01Icon as ReplyIcon,
  Search01Icon as SearchIcon,
  SentIcon,
  Sent02Icon as AllIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import {
  REPORT_STATUS_LABEL,
  deleteContactMessage,
  deleteReport,
  getMessageCounts,
  listContactMessages,
  listReplies,
  listReports,
  sendReply,
  setContactStatus,
  setReportStatus,
  type ContactMessage,
  type ContactStatus,
  type Reply,
  type Report,
  type ReportStatus,
  type ReportType,
} from "@/lib/admin-messages";

// Admin > Messages, laid out like an email client: folders, the list, and a
// reading pane with the conversation and a reply box. Contact-page messages
// and bug reports and ideas from /report. Opening a new message marks it read;
// a reply is emailed to them (Reply-To the contact address) and kept here.
// Without email set up, replying opens the mail app instead.

type FolderId = "inbox" | "replied" | "archived" | "all" | "bugs" | "ideas" | "done";
interface Folder {
  id: FolderId;
  label: string;
  icon: IconSvgElement;
  kind: "contact" | "report";
  statuses: string[];
  type?: ReportType;
}

const FOLDERS: Folder[] = [
  { id: "inbox", label: "Inbox", icon: InboxIcon, kind: "contact", statuses: ["new", "read"] },
  { id: "replied", label: "Replied", icon: SentIcon, kind: "contact", statuses: ["replied"] },
  { id: "archived", label: "Archived", icon: ArchiveIcon, kind: "contact", statuses: ["archived"] },
  { id: "all", label: "All messages", icon: AllIcon, kind: "contact", statuses: [] },
  { id: "bugs", label: "Bugs", icon: BugIcon, kind: "report", statuses: ["open", "reviewing"], type: "bug" },
  { id: "ideas", label: "Ideas", icon: IdeaIcon, kind: "report", statuses: ["open", "reviewing"], type: "feature" },
  { id: "done", label: "Resolved & declined", icon: DoneIcon, kind: "report", statuses: ["resolved", "declined"] },
];

type Item = (ContactMessage & { kind: "contact" }) | (Report & { kind: "report" });

const fromOf = (item: Item) => (item.kind === "contact" ? item.name : (item.userName ?? item.email ?? item.userEmail ?? "Someone"));
const emailOf = (item: Item) => (item.kind === "contact" ? item.email : (item.email ?? item.userEmail));
const subjectOf = (item: Item) => (item.kind === "contact" ? item.topic : item.title);
const bodyOf = (item: Item) => (item.kind === "contact" ? item.message : item.description);
const unread = (item: Item) => (item.kind === "contact" ? item.status === "new" : item.status === "open");
const fullDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold uppercase text-foreground", className)}>
      {name.trim().charAt(0) || "?"}
    </span>
  );
}

function ToolButton({ label, icon, onClick, danger }: { label: string; icon: IconSvgElement; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn("grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", danger && "hover:bg-destructive/10 hover:text-destructive")}
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
    </button>
  );
}

function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export default function AdminMessagesPage() {
  const queryClient = useQueryClient();
  const [folderId, setFolderId] = useState<FolderId>("inbox");
  const folder = FOLDERS.find((f) => f.id === folderId)!;
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(1);
  // The one being read stays open even when a change moves it out of the
  // folder (archiving it from the Inbox, say), and shows its new status at once.
  const [open, setOpen] = useState<Item | null>(null);
  const [toDelete, setToDelete] = useState<Item | null>(null);

  const counts = useQuery({ queryKey: ["admin", "messages", "counts"], queryFn: getMessageCounts, refetchInterval: 60_000 });
  const list = useQuery({
    queryKey: ["admin", "messages", "list", folderId, q, page],
    queryFn: async (): Promise<{ items: Item[]; total: number; pageSize: number }> => {
      if (folder.kind === "contact") {
        const data = await listContactMessages({ statuses: folder.statuses as ContactStatus[], q, page });
        return { ...data, items: data.items.map((m) => ({ ...m, kind: "contact" as const })) };
      }
      const data = await listReports({ statuses: folder.statuses as ReportStatus[], type: folder.type, q, page });
      return { ...data, items: data.items.map((r) => ({ ...r, kind: "report" as const })) };
    },
    placeholderData: keepPreviousData,
  });
  const replies = useQuery({
    queryKey: ["admin", "messages", "replies", open?.kind, open?.id],
    queryFn: () => listReplies(open!.kind, open!.id),
    enabled: !!open,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (list.data?.pageSize ?? 30)));

  const folderCount = (f: Folder): number | null => {
    const c = counts.data;
    if (!c) return null;
    if (f.id === "inbox") return c.contact.new ?? 0;
    if (f.id === "bugs") return c.reports.bug.open ?? 0;
    if (f.id === "ideas") return c.reports.feature.open ?? 0;
    return null;
  };

  const goTo = (id: FolderId) => {
    setFolderId(id);
    setPage(1);
    setOpen(null);
  };

  const setStatus = async (item: Item, status: string, note?: string) => {
    setOpen((current) => (current?.id === item.id ? ({ ...current, status } as Item) : current));
    try {
      if (item.kind === "contact") await setContactStatus(item.id, status as ContactStatus);
      else await setReportStatus(item.id, status as ReportStatus);
      refresh();
      if (note) toast.add({ title: note, type: "success" });
    } catch {
      toast.add({ title: "Couldn't update it.", type: "error" });
    }
  };

  const select = (item: Item) => {
    setOpen(item);
    if (item.kind === "contact" && item.status === "new") void setStatus(item, "read");
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const item = toDelete;
    setToDelete(null);
    try {
      await (item.kind === "contact" ? deleteContactMessage(item.id) : deleteReport(item.id));
      if (open?.id === item.id) setOpen(null);
      refresh();
      toast.add({ title: "Deleted.", type: "success" });
    } catch {
      toast.add({ title: "Couldn't delete it.", type: "error" });
    }
  };

  return (
    // The whole area beside the admin menu (see the admin layout); each pane scrolls on its own.
    <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
      {/* Folders */}
      <nav aria-label="Folders" className="hidden w-56 shrink-0 flex-col gap-0.5 border-r border-border bg-muted/30 p-3 md:flex">
        <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground">Contact</p>
        {FOLDERS.filter((f) => f.kind === "contact").map((f) => (
          <FolderButton key={f.id} folder={f} active={folderId === f.id} count={folderCount(f)} onClick={() => goTo(f.id)} />
        ))}
        <p className="px-2.5 pt-4 pb-1 text-[11px] font-semibold text-muted-foreground">Bugs and ideas</p>
        {FOLDERS.filter((f) => f.kind === "report").map((f) => (
          <FolderButton key={f.id} folder={f} active={folderId === f.id} count={folderCount(f)} onClick={() => goTo(f.id)} />
        ))}
        <div className="mt-auto rounded-lg p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {counts.data?.emailEnabled === false ? "Email isn't set up (Infrastructure › Email): replies open your mail app." : "Replies are emailed from here, and answers come back to the contact address."}
        </div>
      </nav>

      {/* The list */}
      <section aria-label={folder.label} className={cn("flex w-full min-w-0 flex-col border-r border-border md:w-[22rem] md:shrink-0 xl:w-[26rem]", open && "hidden lg:flex")}>
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-sm font-semibold text-foreground">{folder.label}</h1>
            <span className="text-[11px] tabular-nums text-muted-foreground">{total}</span>
          </div>
          {/* Folders as a row on narrow screens. */}
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 md:hidden">
            {FOLDERS.map((f) => (
              <button key={f.id} type="button" onClick={() => goTo(f.id)} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium", folderId === f.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="relative block">
            <HugeiconsIcon icon={SearchIcon} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search"
              aria-label="Search"
              className="h-8 w-full rounded-lg bg-muted pr-2 pl-8 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto">
          {list.isLoading && <li className="p-4 text-xs text-muted-foreground">Loading…</li>}
          {list.isError && <li className="p-4 text-xs text-destructive">Couldn&apos;t load these.</li>}
          {!list.isLoading && !list.isError && items.length === 0 && (
            <li className="p-8 text-center">
              <p className="text-sm font-medium text-foreground">{q ? "Nothing matches" : `${folder.label} is empty`}</p>
              <p className="mt-1 text-xs text-muted-foreground">{folder.kind === "contact" ? "Messages from the contact page land here." : "Reports from /report land here."}</p>
            </li>
          )}
          {items.map((item) => {
            const isOpen = open?.id === item.id;
            const isUnread = unread(isOpen && open ? open : item);
            return (
              <li key={item.id}>
                <button type="button" onClick={() => select(item)} className={cn("flex w-full gap-3 px-3 py-3 text-left transition-colors", isOpen ? "bg-primary/[0.08]" : "hover:bg-muted/50")}>
                  <Avatar name={fromOf(item)} className={cn(isUnread && "bg-primary/15 text-primary")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm text-foreground", isUnread ? "font-semibold" : "font-medium")}>{fromOf(item)}</span>
                      <span className={cn("shrink-0 text-[11px] tabular-nums", isUnread ? "font-medium text-primary" : "text-muted-foreground")} title={fullDate(item.createdAt)}>
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>
                    <span className={cn("mt-0.5 flex items-center gap-1.5 truncate text-[13px]", isUnread ? "font-medium text-foreground" : "text-foreground/80")}>
                      {item.kind === "report" && (
                        <span className={cn("shrink-0 rounded px-1 text-[10px] font-semibold", item.type === "bug" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>{item.type === "bug" ? "Bug" : "Idea"}</span>
                      )}
                      <span className="truncate">{subjectOf(item)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{bodyOf(item)}</span>
                  </span>
                  {isUnread && <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                </button>
              </li>
            );
          })}
        </ul>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            <span className="tabular-nums">
              {page} of {pages}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Newer
              </Button>
              <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Older
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* The reading pane */}
      <section aria-label="Message" className={cn("min-w-0 flex-1 flex-col", open ? "flex" : "hidden lg:flex")}>
        {!open ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <HugeiconsIcon icon={Mail} strokeWidth={1.5} className="mx-auto size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">Pick a message to read it.</p>
            </div>
          </div>
        ) : (
          <ReadingPane
            key={open.id}
            item={open}
            replies={replies.data ?? []}
            emailEnabled={counts.data?.emailEnabled ?? false}
            onBack={() => setOpen(null)}
            onStatus={setStatus}
            onDelete={() => setToDelete(open)}
            onReplied={() => {
              setOpen((current) =>
                current && current.kind === "contact" ? { ...current, status: "replied" } : current && current.status === "open" ? { ...current, status: "reviewing" } : current,
              );
              refresh();
            }}
          />
        )}
      </section>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this for good?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `"${subjectOf(toDelete)}" from ${fromOf(toDelete)}` : "It"} and any replies to it will be removed. This can&apos;t be undone. To keep it but out of the way, archive or resolve it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FolderButton({ folder, active, count, onClick }: { folder: Folder; active: boolean; count: number | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors", active ? "bg-background font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60 hover:text-foreground")}
    >
      <HugeiconsIcon icon={folder.icon} strokeWidth={2} className="size-4 shrink-0" />
      <span className="flex-1 truncate">{folder.label}</span>
      {count ? <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 tabular-nums text-primary-foreground">{count}</span> : null}
    </button>
  );
}

function ReadingPane({
  item,
  replies,
  emailEnabled,
  onBack,
  onStatus,
  onDelete,
  onReplied,
}: {
  item: Item;
  replies: Reply[];
  emailEnabled: boolean;
  onBack: () => void;
  onStatus: (item: Item, status: string, note?: string) => Promise<void>;
  onDelete: () => void;
  onReplied: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const to = emailOf(item);
  const firstName = fromOf(item).split(/\s+/)[0];
  const mailto = useMemo(
    () => (to ? `mailto:${to}?subject=${encodeURIComponent(`Re: ${subjectOf(item)}`)}${draft.trim() ? `&body=${encodeURIComponent(draft.trim())}` : ""}` : null),
    [to, item, draft],
  );

  // New replies scroll into view.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [replies.length]);

  const send = async () => {
    if (!draft.trim() || !to || sending) return;
    setSending(true);
    try {
      await sendReply(item.kind, item.id, draft.trim());
      setDraft("");
      onReplied();
      toast.add({ title: `Reply sent to ${to}.`, type: "success" });
    } catch (err) {
      toast.add({ title: "The reply wasn't sent.", description: err instanceof Error ? err.message : undefined, type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        <button type="button" onClick={onBack} aria-label="Back to the list" className="mr-1 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden">
          <HugeiconsIcon icon={BackIcon} strokeWidth={2} className="size-4" />
        </button>
        {item.kind === "contact" ? (
          <>
            {item.status !== "archived" ? (
              <ToolButton label="Archive" icon={ArchiveIcon} onClick={() => void onStatus(item, "archived", "Archived.")} />
            ) : (
              <ToolButton label="Move to Inbox" icon={InboxIcon} onClick={() => void onStatus(item, "read", "Moved to the Inbox.")} />
            )}
            <ToolButton label="Mark as unread" icon={MarkUnread} onClick={() => void onStatus(item, "new", "Marked unread.")} />
          </>
        ) : (
          <div role="group" aria-label="Status" className="flex rounded-lg bg-muted p-0.5">
            {(Object.keys(REPORT_STATUS_LABEL) as ReportStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={item.status === status}
                onClick={() => item.status !== status && void onStatus(item, status, `Marked ${REPORT_STATUS_LABEL[status].toLowerCase()}.`)}
                className={cn("rounded-md px-2 py-1 text-[11px] font-medium transition-colors", item.status === status ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {REPORT_STATUS_LABEL[status]}
              </button>
            ))}
          </div>
        )}
        <span className="flex-1" />
        <ToolButton label="Delete" icon={Trash} onClick={onDelete} danger />
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-foreground">{subjectOf(item)}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {item.kind === "report" ? (
              <span className={cn("rounded px-1.5 py-0.5 font-semibold", item.type === "bug" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>{item.type === "bug" ? "Bug report" : "Idea"}</span>
            ) : (
              <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">Contact form</span>
            )}
            {item.kind === "contact" && <span>{item.emailedAt ? "Copy emailed to the team" : "Not emailed to the team (email off or failed)"}</span>}
          </div>

          {/* Their message */}
          <article className="mt-5 rounded-xl border border-border p-4">
            <header className="flex items-start gap-3">
              <Avatar name={fromOf(item)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm font-semibold text-foreground">
                    {fromOf(item)} {to && <span className="font-normal text-muted-foreground">&lt;{to}&gt;</span>}
                  </p>
                  <time className="text-[11px] text-muted-foreground" dateTime={item.createdAt}>
                    {fullDate(item.createdAt)}
                  </time>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  to Savedly
                  {item.userId ? ` · signed in as ${item.userEmail}` : " · not signed in"}
                </p>
              </div>
            </header>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{bodyOf(item)}</p>
            {item.kind === "report" && item.pageUrl && (
              <a href={item.pageUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex max-w-full items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                <HugeiconsIcon icon={LinkOut} strokeWidth={2} className="size-3.5 shrink-0" />
                <span className="truncate">Sent from {item.pageUrl}</span>
              </a>
            )}
          </article>

          {/* What's been said back */}
          {replies.map((reply) => (
            <article key={reply.id} className="mt-3 ml-6 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
              <header className="flex items-start gap-3">
                <Avatar name={reply.adminName ?? "Savedly"} className="size-8 bg-primary text-primary-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm font-semibold text-foreground">{reply.adminName ?? reply.adminEmail ?? "Savedly"}</p>
                    <time className="text-[11px] text-muted-foreground" dateTime={reply.createdAt}>
                      {fullDate(reply.createdAt)}
                    </time>
                  </div>
                  <p className="text-[11px] text-muted-foreground">to {reply.toEmail}</p>
                </div>
              </header>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{reply.body}</p>
            </article>
          ))}
        </div>
      </div>

      {/* Reply */}
      <div className="border-t border-border px-6 py-3">
        <div className="mx-auto max-w-3xl">
          {!to ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">They didn&apos;t leave an email address, so there&apos;s no one to reply to.</p>
          ) : (
            <div className="rounded-xl border border-border bg-background focus-within:border-primary/50">
              <p className="flex items-center gap-1.5 px-3 pt-2.5 text-[11px] text-muted-foreground">
                <HugeiconsIcon icon={ReplyIcon} strokeWidth={2} className="size-3.5" />
                Reply to {fromOf(item)} &lt;{to}&gt;
              </p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && emailEnabled) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={4}
                maxLength={10000}
                placeholder={`Write to ${firstName}…`}
                aria-label="Reply"
                className="block w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <span className="px-1 text-[11px] text-muted-foreground">
                  {emailEnabled ? "Their message is quoted below your reply. Ctrl+Enter sends." : "Email isn't set up on this server, so this opens your mail app."}
                </span>
                {emailEnabled ? (
                  <Button size="sm" disabled={!draft.trim() || sending} onClick={send}>
                    <HugeiconsIcon icon={SentIcon} strokeWidth={2} className="size-4" />
                    {sending ? "Sending…" : "Send"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={async () => {
                      // Marked first: opening the mail app can cancel a request still on its way.
                      if (item.kind === "contact") await onStatus(item, "replied");
                      if (mailto) window.location.href = mailto;
                    }}
                  >
                    <HugeiconsIcon icon={Mail} strokeWidth={2} className="size-4" />
                    Open in mail app
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
