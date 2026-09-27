"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon as Copy,
  Layers01Icon as Layers,
  FileTextIcon as FileText,
  UserLockIcon as UserLock,
  EyeIcon as Eye,
  MoreHorizontalIcon as MoreHorizontal,
  RefreshIcon as Refresh,
  ChartLineData01Icon as ChartLine,
  LinkOffIcon as LinkOff,
  PlusSignIcon as Plus,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/query-error-state";
import { Reveal } from "@/components/ui/reveal";
import { StatTile } from "@/components/stat-tile";
import { toast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import { copyToClipboard } from "@/lib/clipboard";
import {
  useApproveRequestMutation,
  useDeleteShareMutation,
  useDenyRequestMutation,
  useMySharesQuery,
  usePendingRequestsQuery,
  useRotateSlugMutation,
  useSharedWithMeQuery,
} from "@/hooks/use-shares";
import { LINK_MODE_META } from "@/lib/share-display";
import type { ShareAccessRequest, ShareListItem } from "@/lib/shares";
import { PageHeader, EmptyState } from "@/components/app-page";

export default function SharedPage() {
  const mine = useMySharesQuery();
  const withMe = useSharedWithMeQuery();
  const requests = usePendingRequestsQuery();

  if (mine.isError) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
        <PageHeader title="Shared" description="Everything you've shared, and everything shared with you." />
        <QueryErrorState title="Couldn't load your shares" onRetry={() => mine.refetch()} />
      </div>
    );
  }

  const loading = mine.isLoading || withMe.isLoading;
  const pending = requests.data ?? [];
  const shares = mine.data ?? [];
  const shared = withMe.data ?? [];
  const totalViews = shares.reduce((sum, s) => sum + s.viewCount, 0);
  const activeLinks = shares.filter((s) => s.linkAccess !== "disabled" && !isExpired(s.expiresAt)).length;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 md:py-10">
      <PageHeader title="Shared" description="Everything you've shared, and everything shared with you." />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* At-a-glance overview — the list below answers "which one?", this
              answers "how is sharing going overall?" without opening each one. */}
          {shares.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Shared" value={String(shares.length)} />
              <StatTile label="Active links" value={String(activeLinks)} />
              <StatTile label="Total views" value={totalViews.toLocaleString()} />
              <StatTile label="Pending requests" value={String(pending.length)} />
            </div>
          )}

          {pending.length > 0 && (
            <Section title="Pending requests" subtitle="People waiting on you">
              <ul className="space-y-2">
                {pending.map((request, index) => (
                  <Reveal key={request.id} index={Math.min(index, 6)}>
                    <RequestRow request={request} />
                  </Reveal>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Shared by you" subtitle={shares.length === 0 ? undefined : `${shares.length} in total`}>
            {shares.length === 0 ? (
              <EmptyState
                title="You haven't shared anything yet"
                description="Open a memory or collection and hit Share to create a link."
                action={
                  <Link
                    href="/app/memories"
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
                  >
                    <HugeiconsIcon icon={Plus} strokeWidth={2} className="h-4 w-4" /> Browse your memories
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-2">
                {shares.map((share, index) => (
                  <Reveal key={share.id} index={Math.min(index, 8)}>
                    <MyShareRow share={share} />
                  </Reveal>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Shared with you">
            {shared.length === 0 ? (
              <EmptyState title="Nothing has been shared with you yet" />
            ) : (
              <ul className="space-y-2">
                {shared.map((item, index) => (
                  <Reveal key={item.shareId} index={Math.min(index, 8)}>
                    <li>
                      <Link
                        href={`/s/${item.slug}`}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/30"
                      >
                        <ResourceIcon type={item.resourceType} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{item.resourceName}</span>
                          <span className="block text-[13px] text-muted-foreground">
                            from {item.ownerName ?? "someone"} · {timeAgo(item.sharedAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  </Reveal>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function isExpired(expiresAt: string | null): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted-foreground/80">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ResourceIcon({ type }: { type: "collection" | "memory" }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <HugeiconsIcon icon={type === "collection" ? Layers : FileText} strokeWidth={2} className="h-4.5 w-4.5" />
    </span>
  );
}

function MyShareRow({ share }: { share: ShareListItem }) {
  const mode = LINK_MODE_META[share.linkAccess];
  const expired = isExpired(share.expiresAt);
  const url = typeof window !== "undefined" ? `${window.location.origin}/s/${share.slug}` : "";

  const rotate = useRotateSlugMutation();
  const remove = useDeleteShareMutation();
  const [stopOpen, setStopOpen] = React.useState(false);

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <ResourceIcon type={share.resourceType} />

      {/* The resource name is the entry point into the dedicated analytics
          page — everything about who viewed it and when lives there now,
          rather than in an inline widget competing for space in this list. */}
      <Link href={`/app/shared/${share.id}`} className="min-w-0 flex-1 group/row">
        <p className="truncate text-sm font-medium text-foreground group-hover/row:text-primary">
          {share.resourceName}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
          {expired ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
              Expired
            </span>
          ) : (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase", mode.tone)}>
              <HugeiconsIcon icon={mode.icon} strokeWidth={2} className="h-3 w-3" />
              {mode.label}
            </span>
          )}
          {share.grantCount > 0 && <span>{share.grantCount} with access</span>}
          <span className="flex items-center gap-0.5">
            <HugeiconsIcon icon={Eye} strokeWidth={2} className="h-3 w-3" />
            {share.viewCount}
          </span>
          {share.pendingRequestCount > 0 && (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {share.pendingRequestCount} pending
            </span>
          )}
        </p>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        {/* An invite-only link still works for the people invited, so the
            copy button stays useful in every mode. */}
        {share.linkAccess !== "disabled" && (
          <Button size="icon" variant="outline" aria-label="Copy link" className="h-9 w-9 rounded-full" onClick={() => void copyToClipboard(url)}>
            <HugeiconsIcon icon={Copy} strokeWidth={2} className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="icon" variant="outline" aria-label="More actions" className="h-9 w-9 rounded-full">
                <HugeiconsIcon icon={MoreHorizontal} strokeWidth={2} className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/app/shared/${share.id}`} />}>
              <HugeiconsIcon icon={ChartLine} strokeWidth={2} className="h-3.5 w-3.5" /> View analytics
            </DropdownMenuItem>
            {share.linkAccess !== "disabled" && (
              <DropdownMenuItem
                disabled={rotate.isPending}
                onClick={() => {
                  rotate.mutate(share.id, {
                    onSuccess: () => toast.add({ title: "New link generated", description: "The old link no longer works.", type: "success" }),
                    onError: (err) => toast.add({ title: "Couldn't generate a new link", description: err instanceof Error ? err.message : undefined, type: "error" }),
                  });
                }}
              >
                <HugeiconsIcon icon={Refresh} strokeWidth={2} className="h-3.5 w-3.5" /> Generate new link
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setStopOpen(true)}>
              <HugeiconsIcon icon={LinkOff} strokeWidth={2} className="h-3.5 w-3.5" /> Stop sharing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={stopOpen} onOpenChange={setStopOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia tone="destructive">
              <HugeiconsIcon icon={LinkOff} strokeWidth={2} />
            </AlertDialogMedia>
            <AlertDialogTitle>Stop sharing &ldquo;{share.resourceName}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>The link stops working immediately, and anyone with access loses it. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                remove.mutate(share.id, {
                  onSuccess: () => toast.add({ title: "Sharing turned off", description: share.resourceName, type: "success" }),
                  onError: (err) => toast.add({ title: "Couldn't stop sharing this", description: err instanceof Error ? err.message : undefined, type: "error" }),
                });
              }}
            >
              Stop sharing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function RequestRow({ request }: { request: ShareAccessRequest }) {
  const approve = useApproveRequestMutation();
  const deny = useDenyRequestMutation();
  const busy = approve.isPending || deny.isPending;

  async function decide(action: "approve" | "deny") {
    const mutation = action === "approve" ? approve : deny;
    try {
      await mutation.mutateAsync({ id: request.shareId, requestId: request.id });
      toast.add({ title: action === "approve" ? "Access granted" : "Request declined", type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't update that request.", type: "error" });
    }
  }

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <HugeiconsIcon icon={UserLock} strokeWidth={2} className="h-4.5 w-4.5" />
      </span>

      <div className="min-w-0 flex-1 space-y-0.5 py-0.5">
        <p className="text-sm text-foreground">
          <span className="font-medium">{request.requesterName ?? request.requesterEmail}</span> wants access to{" "}
          <span className="font-medium">{request.resourceName}</span>
        </p>
        {request.message && <p className="text-[13px] italic text-muted-foreground">&ldquo;{request.message}&rdquo;</p>}
        <p className="text-xs text-muted-foreground/70">{timeAgo(request.createdAt)}</p>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" disabled={busy} onClick={() => decide("approve")} className="h-8 rounded-full px-3 text-xs">
          Approve
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("deny")} className="h-8 rounded-full px-3 text-xs">
          Decline
        </Button>
      </div>
    </li>
  );
}
