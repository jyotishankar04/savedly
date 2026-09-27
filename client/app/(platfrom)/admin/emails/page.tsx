"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "@/components/ui/toast";
import { PaginationFooter } from "@/components/admin/pagination-footer";
import { listUsers, type AdminUser } from "@/lib/admin-users";
import {
  getCampaignMessages,
  listCampaigns,
  sendEmail,
  type EmailCampaignCategory,
} from "@/lib/admin-emails";

const CATEGORY_LABEL: Record<EmailCampaignCategory, string> = {
  marketing: "Marketing",
  alert: "Alert",
  announcement: "Announcement",
  custom: "Custom",
};

function categoryBadgeVariant(category: EmailCampaignCategory): "default" | "secondary" | "outline" | "destructive" {
  if (category === "alert") return "destructive";
  if (category === "announcement") return "default";
  if (category === "marketing") return "secondary";
  return "outline";
}

export default function AdminEmailsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [msgPage, setMsgPage] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "emails", page],
    queryFn: () => listCampaigns({ page, limit }),
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["admin", "emails", expandedId, "messages", msgPage],
    queryFn: () => getCampaignMessages(expandedId as string, { page: msgPage, limit: 10 }),
    enabled: Boolean(expandedId),
  });

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id));
    setMsgPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Emails</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Send marketing, alert, or announcement emails to one or many users, and track delivery. Automatic emails (welcome,
            account status changes, share invites) aren&apos;t listed here — this is only the bulk composer&apos;s history.
          </p>
        </div>
        <Button size="sm" className="h-9 shrink-0 rounded-full px-4 text-xs font-bold" onClick={() => setComposeOpen(true)}>
          Compose
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Subject</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Category</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Recipients</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-destructive">
                  Failed to load emails.
                </td>
              </tr>
            )}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No emails sent yet.
                </td>
              </tr>
            )}
            {data?.items.map((campaign) => (
              <React.Fragment key={campaign.id}>
                <tr
                  className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
                  onClick={() => toggleExpanded(campaign.id)}
                >
                  <td className="max-w-xs truncate px-4 py-2.5 font-semibold text-foreground">{campaign.subject}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={categoryBadgeVariant(campaign.category)}>{CATEGORY_LABEL[campaign.category]}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{campaign.recipientCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="text-emerald-600">{campaign.sent} sent</span>
                      {campaign.failed > 0 && <span className="text-destructive">{campaign.failed} failed</span>}
                      {campaign.queued > 0 && <span className="text-muted-foreground">{campaign.queued} queued</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(campaign.createdAt).toLocaleString()}</td>
                </tr>
                {expandedId === campaign.id && (
                  <tr className="bg-muted/20">
                    <td colSpan={5} className="px-4 py-3">
                      {messagesLoading ? (
                        <p className="text-[10px] text-muted-foreground">Loading recipients...</p>
                      ) : messages && messages.items.length > 0 ? (
                        <div className="space-y-2">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="py-1 text-left font-semibold">Recipient</th>
                                <th className="py-1 text-left font-semibold">Status</th>
                                <th className="py-1 text-left font-semibold">Sent</th>
                              </tr>
                            </thead>
                            <tbody>
                              {messages.items.map((message) => (
                                <tr key={message.id} className="border-t border-border/30">
                                  <td className="py-1.5 font-mono">{message.recipientEmail}</td>
                                  <td className="py-1.5">
                                    <Badge
                                      variant={
                                        message.status === "sent" ? "secondary" : message.status === "failed" ? "destructive" : "outline"
                                      }
                                      title={message.error ?? undefined}
                                    >
                                      {message.status}
                                    </Badge>
                                  </td>
                                  <td className="py-1.5 text-muted-foreground">
                                    {message.sentAt ? new Date(message.sentAt).toLocaleTimeString() : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <PaginationFooter page={messages.page} limit={messages.limit} total={messages.total} onPageChange={setMsgPage} itemLabel="recipient" />
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">No recipients.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {data && <PaginationFooter page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} itemLabel="email" />}

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSent={() => queryClient.invalidateQueries({ queryKey: ["admin", "emails"] })}
      />
    </div>
  );
}

function ComposeDialog({ open, onOpenChange, onSent }: { open: boolean; onOpenChange: (open: boolean) => void; onSent: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<EmailCampaignCategory>("custom");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, AdminUser>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);

  function reset() {
    setSubject("");
    setBody("");
    setCategory("custom");
    setSendToAll(true);
    setSelectedUsers(new Map());
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!subject.trim() || !body.trim() || sending) return;
    if (!sendToAll && selectedUsers.size === 0) {
      toast.add({ title: "Select at least one recipient.", type: "error" });
      return;
    }

    setSending(true);
    try {
      const result = await sendEmail({
        subject: subject.trim(),
        body: body.trim(),
        category,
        recipients: sendToAll ? { all: true } : { userIds: Array.from(selectedUsers.keys()) },
      });
      toast.add({ title: "Email queued", description: `${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}`, type: "success" });
      onSent();
      handleOpenChange(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't send this email.", type: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg gap-5 p-6">
          <DialogHeader className="border-b border-border/20 pb-3">
            <DialogTitle className="text-xs font-bold">Compose email</DialogTitle>
            <DialogDescription className="text-[11px]">Sent through the queue — delivery may take a few seconds per recipient.</DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Category</label>
              <Select items={{ marketing: "Marketing", alert: "Alert", announcement: "Announcement", custom: "Custom" }} value={category} onValueChange={(v) => v && setCategory(v as EmailCampaignCategory)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" required className="h-9" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Message</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." rows={6} required />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recipients</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSendToAll(true)}
                  className={`h-8 flex-1 rounded-full border text-[11px] font-semibold transition-colors ${sendToAll ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  All active users
                </button>
                <button
                  type="button"
                  onClick={() => setSendToAll(false)}
                  className={`h-8 flex-1 rounded-full border text-[11px] font-semibold transition-colors ${!sendToAll ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  Select users
                </button>
              </div>

              {!sendToAll && (
                <div className="space-y-2">
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-full text-[11px]" onClick={() => setPickerOpen(true)}>
                    {selectedUsers.size > 0 ? `${selectedUsers.size} selected — edit` : "Choose recipients..."}
                  </Button>
                  {selectedUsers.size > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selectedUsers.values()).map((u) => (
                        <span key={u.id} className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px]">
                          {u.name ?? u.email}
                          <button
                            type="button"
                            onClick={() => setSelectedUsers((prev) => { const next = new Map(prev); next.delete(u.id); return next; })}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="rounded-full">
                Cancel
              </Button>
              <Button type="submit" disabled={sending} className="rounded-full">
                {sending ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RecipientPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selected={selectedUsers}
        onToggle={(user) =>
          setSelectedUsers((prev) => {
            const next = new Map(prev);
            if (next.has(user.id)) next.delete(user.id);
            else next.set(user.id, user);
            return next;
          })
        }
      />
    </>
  );
}

function RecipientPicker({
  open,
  onOpenChange,
  selected,
  onToggle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Map<string, AdminUser>;
  onToggle: (user: AdminUser) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", "picker"],
    queryFn: () => listUsers({ limit: 100 }),
    enabled: open,
  });
  const users = data?.items ?? [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Select recipients" description="Search users to add or remove them.">
      <CommandInput placeholder="Search users..." />
      <CommandList>
        {isLoading ? (
          <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">Loading…</div>
        ) : (
          <>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem key={user.id} value={`${user.name ?? ""} ${user.email}`} data-checked={selected.has(user.id)} onSelect={() => onToggle(user)}>
                  <span className="truncate">{user.name ?? user.email}</span>
                  <span className="ml-auto truncate text-[10px] text-muted-foreground">{user.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
