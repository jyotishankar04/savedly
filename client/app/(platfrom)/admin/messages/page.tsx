"use client";

import React, { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon as Trash, LinkSquare02Icon as LinkOut, Mail01Icon as Mail, Search01Icon as SearchIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CONTACT_STATUS_LABEL,
  REPORT_STATUS_LABEL,
  deleteContactMessage,
  deleteReport,
  getMessageCounts,
  listContactMessages,
  listReports,
  setContactStatus,
  setReportStatus,
  type ContactMessage,
  type ContactStatus,
  type Report,
  type ReportStatus,
  type ReportType,
} from "@/lib/admin-messages";

// Admin > Messages: what people send from the website. Contact-page messages
// (each one saved, then copied to the team's inbox) and bug reports and ideas
// from /report. Opening a new message marks it read; Reply by email opens the
// mail app and marks it replied.

type Tab = "contact" | "reports";

const STATUS_DOT: Record<string, string> = {
  new: "bg-primary",
  open: "bg-primary",
  read: "bg-muted-foreground/50",
  reviewing: "bg-amber-500",
  replied: "bg-emerald-500",
  resolved: "bg-emerald-500",
  archived: "bg-muted-foreground/30",
  declined: "bg-muted-foreground/30",
};

const fullDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
        active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
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
  const [tab, setTab] = useState<Tab>("contact");
  const [contactStatus, setContactFilter] = useState<ContactStatus | undefined>(undefined);
  const [reportStatus, setReportFilter] = useState<ReportStatus | undefined>(undefined);
  const [reportType, setReportType] = useState<ReportType | undefined>(undefined);
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  // The one being read stays in the details even when a change moves it out of
  // the current filter (archiving from "Replied", say), and shows its new
  // status at once.
  const [pinned, setPinned] = useState<ContactMessage | Report | null>(null);
  const [toDelete, setToDelete] = useState<{ tab: Tab; id: string; label: string } | null>(null);

  const counts = useQuery({ queryKey: ["admin", "messages", "counts"], queryFn: getMessageCounts });
  const contact = useQuery({
    queryKey: ["admin", "messages", "contact", contactStatus, q, page],
    queryFn: () => listContactMessages({ status: contactStatus, q, page }),
    enabled: tab === "contact",
    placeholderData: keepPreviousData,
  });
  const reports = useQuery({
    queryKey: ["admin", "messages", "reports", reportStatus, reportType, q, page],
    queryFn: () => listReports({ status: reportStatus, type: reportType, q, page }),
    enabled: tab === "reports",
    placeholderData: keepPreviousData,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });

  const switchTab = (next: Tab) => {
    setTab(next);
    setSelected(null);
    setPinned(null);
    setPage(1);
  };

  const list = tab === "contact" ? contact : reports;
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (list.data?.pageSize ?? 30)));
  const isContact = (item: ContactMessage | Report | null): item is ContactMessage => !!item && "topic" in item;
  const contactItem = tab === "contact" && pinned?.id === selected && isContact(pinned) ? pinned : undefined;
  const reportItem = tab === "reports" && pinned?.id === selected && pinned && !isContact(pinned) ? pinned : undefined;

  const changeContact = async (item: ContactMessage, status: ContactStatus, quiet = false) => {
    setPinned((current) => (current?.id === item.id ? { ...item, status } : current));
    try {
      await setContactStatus(item.id, status);
      refresh();
      if (!quiet) toast.add({ title: `Marked ${CONTACT_STATUS_LABEL[status].toLowerCase()}.`, type: "success" });
    } catch {
      toast.add({ title: "Couldn't update it.", type: "error" });
    }
  };
  const changeReport = async (item: Report, status: ReportStatus) => {
    setPinned((current) => (current?.id === item.id ? { ...item, status } : current));
    try {
      await setReportStatus(item.id, status);
      refresh();
      toast.add({ title: `Marked ${REPORT_STATUS_LABEL[status].toLowerCase()}.`, type: "success" });
    } catch {
      toast.add({ title: "Couldn't update it.", type: "error" });
    }
  };

  const open = (id: string) => {
    setSelected(id);
    const item = tab === "contact" ? contact.data?.items.find((m) => m.id === id) : reports.data?.items.find((r) => r.id === id);
    setPinned(item ?? null);
    // Opening a new message is reading it.
    if (item && isContact(item) && item.status === "new") void changeContact(item, "read", true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    try {
      await (target.tab === "contact" ? deleteContactMessage(target.id) : deleteReport(target.id));
      if (selected === target.id) {
        setSelected(null);
        setPinned(null);
      }
      refresh();
      toast.add({ title: "Deleted.", type: "success" });
    } catch {
      toast.add({ title: "Couldn't delete it.", type: "error" });
    }
  };

  const contactCounts = contact.data?.counts ?? {};
  const reportCounts = reports.data?.counts ?? {};

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h1 className="text-lg font-bold text-foreground">Messages</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          What people send from the website: messages from the contact page, and bug reports and ideas from /report. Every one is saved here, and a copy is emailed to the
          contact address when email is set up (Infrastructure › Email).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Kind" className="inline-flex rounded-xl bg-muted p-1">
          {(
            [
              ["contact", "Contact", counts.data?.newContact ?? 0, "new"],
              ["reports", "Bugs & ideas", counts.data?.openReports ?? 0, "open"],
            ] as const
          ).map(([id, label, waiting, word]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => switchTab(id)}
              className={cn("inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors", tab === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
              {waiting > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground" title={`${waiting} ${word}`}>
                  {waiting}
                </span>
              )}
            </button>
          ))}
        </div>
        <label className="relative w-full max-w-xs">
          <HugeiconsIcon icon={SearchIcon} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={tab === "contact" ? "Search names, emails, messages" : "Search titles, descriptions, emails"}
            aria-label="Search"
            className="pl-9"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tab === "contact" ? (
          <>
            <Chip active={!contactStatus} onClick={() => (setContactFilter(undefined), setPage(1))}>
              All
            </Chip>
            {(Object.keys(CONTACT_STATUS_LABEL) as ContactStatus[]).map((status) => (
              <Chip key={status} active={contactStatus === status} onClick={() => (setContactFilter(status), setPage(1))}>
                {CONTACT_STATUS_LABEL[status]}
                <span className="tabular-nums opacity-60">{contactCounts[status] ?? 0}</span>
              </Chip>
            ))}
          </>
        ) : (
          <>
            <Chip active={!reportStatus} onClick={() => (setReportFilter(undefined), setPage(1))}>
              All
            </Chip>
            {(Object.keys(REPORT_STATUS_LABEL) as ReportStatus[]).map((status) => (
              <Chip key={status} active={reportStatus === status} onClick={() => (setReportFilter(status), setPage(1))}>
                {REPORT_STATUS_LABEL[status]}
                <span className="tabular-nums opacity-60">{reportCounts[status] ?? 0}</span>
              </Chip>
            ))}
            <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
            <Chip active={!reportType} onClick={() => (setReportType(undefined), setPage(1))}>
              Bugs and ideas
            </Chip>
            <Chip active={reportType === "bug"} onClick={() => (setReportType("bug"), setPage(1))}>
              Bugs
            </Chip>
            <Chip active={reportType === "feature"} onClick={() => (setReportType("feature"), setPage(1))}>
              Ideas
            </Chip>
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <section aria-label="List" className="space-y-2">
          {list.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {list.isError && <p className="text-xs text-destructive">Couldn&apos;t load these.</p>}
          {!list.isLoading && !list.isError && total === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm font-medium text-foreground">{q || contactStatus || reportStatus || reportType ? "Nothing matches" : "Nothing here yet"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tab === "contact" ? "Messages from the contact page land here." : "Bug reports and ideas from /report land here."}
              </p>
            </div>
          )}

          {tab === "contact" &&
            contact.data?.items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => open(m.id)}
                className={cn("flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/40", selected === m.id ? "border-primary/60" : "border-border")}
              >
                <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", STATUS_DOT[m.status])} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={cn("truncate text-sm text-foreground", m.status === "new" ? "font-semibold" : "font-medium")}>{m.name}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground" title={fullDate(m.createdAt)}>
                      {timeAgo(m.createdAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-1.5 py-0.5">{m.topic}</span>
                    <span className="truncate">{m.email}</span>
                  </span>
                  <span className="mt-1 line-clamp-1 text-xs text-muted-foreground">{m.message}</span>
                </span>
              </button>
            ))}

          {tab === "reports" &&
            reports.data?.items.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => open(r.id)}
                className={cn("flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/40", selected === r.id ? "border-primary/60" : "border-border")}
              >
                <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", STATUS_DOT[r.status])} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={cn("truncate text-sm text-foreground", r.status === "open" ? "font-semibold" : "font-medium")}>{r.title}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground" title={fullDate(r.createdAt)}>
                      {timeAgo(r.createdAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className={cn("rounded-full px-1.5 py-0.5", r.type === "bug" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>{r.type === "bug" ? "Bug" : "Idea"}</span>
                    <span>{REPORT_STATUS_LABEL[r.status]}</span>
                    <span className="truncate">{r.email ?? r.userEmail ?? "no email"}</span>
                  </span>
                </span>
              </button>
            ))}

          {pages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                Page {page} of {pages} · {total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* The details */}
        <section aria-label="Details" className="self-start xl:sticky xl:top-6">
          {!contactItem && !reportItem && (
            <div className="hidden rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground xl:block">Pick one to read it.</div>
          )}

          {contactItem && (
            <article className="space-y-4 rounded-xl border border-border bg-card p-5">
              <header className="space-y-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-foreground">{contactItem.topic}</span>
                  <span>{fullDate(contactItem.createdAt)}</span>
                </div>
                <h2 className="text-base font-semibold text-foreground">{contactItem.name}</h2>
                <a href={`mailto:${contactItem.email}`} className="text-sm text-primary hover:underline">
                  {contactItem.email}
                </a>
                <p className="text-[11px] text-muted-foreground">
                  {contactItem.userId ? `Signed in as ${contactItem.userName ? `${contactItem.userName}, ` : ""}${contactItem.userEmail}` : "Not signed in"}
                  {" · "}
                  {contactItem.emailedAt ? "copy emailed to the team" : "not emailed (email off or failed)"}
                </p>
              </header>
              <p className="whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground">{contactItem.message}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    // Saved first: opening the mail app can cancel a request still on its way.
                    await changeContact(contactItem, "replied", true);
                    window.location.href = `mailto:${contactItem.email}?subject=${encodeURIComponent(`Re: ${contactItem.topic}`)}`;
                  }}
                >
                  <HugeiconsIcon icon={Mail} strokeWidth={2} className="h-4 w-4" />
                  Reply by email
                </Button>
                {contactItem.status !== "archived" ? (
                  <Button variant="outline" size="sm" onClick={() => changeContact(contactItem, "archived")}>
                    Archive
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => changeContact(contactItem, "read")}>
                    Move back to Read
                  </Button>
                )}
                {contactItem.status !== "new" && (
                  <Button variant="ghost" size="sm" onClick={() => changeContact(contactItem, "new")}>
                    Mark as new
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:bg-destructive/10" onClick={() => setToDelete({ tab: "contact", id: contactItem.id, label: `the message from ${contactItem.name}` })}>
                  <HugeiconsIcon icon={Trash} strokeWidth={2} className="h-4 w-4" />
                  Delete
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Status: {CONTACT_STATUS_LABEL[contactItem.status]}. Reply by email marks it replied.</p>
            </article>
          )}

          {reportItem && (
            <article className="space-y-4 rounded-xl border border-border bg-card p-5">
              <header className="space-y-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className={cn("rounded-full px-2 py-0.5", reportItem.type === "bug" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>{reportItem.type === "bug" ? "Bug" : "Idea"}</span>
                  <span>{fullDate(reportItem.createdAt)}</span>
                </div>
                <h2 className="text-base font-semibold text-foreground">{reportItem.title}</h2>
                <p className="text-[11px] text-muted-foreground">
                  {reportItem.email ? (
                    <a href={`mailto:${reportItem.email}`} className="text-primary hover:underline">
                      {reportItem.email}
                    </a>
                  ) : (
                    "No email left"
                  )}
                  {reportItem.userId ? ` · signed in as ${reportItem.userEmail}` : " · not signed in"}
                </p>
                {reportItem.pageUrl && (
                  <a href={reportItem.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                    <HugeiconsIcon icon={LinkOut} strokeWidth={2} className="h-3.5 w-3.5" />
                    <span className="truncate">{reportItem.pageUrl}</span>
                  </a>
                )}
              </header>
              <p className="whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground">{reportItem.description}</p>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-foreground">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(REPORT_STATUS_LABEL) as ReportStatus[]).map((status) => (
                    <Chip key={status} active={reportItem.status === status} onClick={() => reportItem.status !== status && changeReport(reportItem, status)}>
                      {REPORT_STATUS_LABEL[status]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(reportItem.email ?? reportItem.userEmail) && (
                  <Button size="sm" render={<a href={`mailto:${reportItem.email ?? reportItem.userEmail}?subject=${encodeURIComponent(`Re: ${reportItem.title}`)}`} />}>
                    <HugeiconsIcon icon={Mail} strokeWidth={2} className="h-4 w-4" />
                    Reply by email
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:bg-destructive/10" onClick={() => setToDelete({ tab: "reports", id: reportItem.id, label: `"${reportItem.title}"` })}>
                  <HugeiconsIcon icon={Trash} strokeWidth={2} className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </article>
          )}
        </section>
      </div>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this for good?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.label ? `${toDelete.label[0]!.toUpperCase()}${toDelete.label.slice(1)}` : "It"} will be removed. This can&apos;t be undone. To keep it but out of the way, archive or resolve it instead.
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
