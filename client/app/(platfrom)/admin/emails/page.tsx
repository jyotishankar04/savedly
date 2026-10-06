"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationFooter } from "@/components/admin/pagination-footer";
import { getCampaignMessages, listCampaigns, type EmailCampaignCategory } from "@/lib/admin-emails";

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
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [msgPage, setMsgPage] = useState(1);
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
        <Button size="sm" className="h-9 shrink-0 rounded-full px-4 text-xs font-bold" nativeButton={false} render={<Link href="/admin/emails/compose" />}>
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
    </div>
  );
}
