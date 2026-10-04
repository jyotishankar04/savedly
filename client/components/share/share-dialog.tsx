"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Globe02Icon as Globe,
  LockPasswordIcon as Lock,
  UserLockIcon as UserLock,
  CircleLockIcon as Restricted,
  Copy01Icon as Copy,
  Delete02Icon as Trash,
  RefreshIcon as Refresh,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ProBadge } from "@/components/plan-limit-notice";
import { ShareAnalytics } from "@/components/share/share-analytics";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";
import { usePlanFeature, usePlanLimit } from "@/hooks/use-plan-limit";
import {
  useApproveRequestMutation,
  useCreateShareMutation,
  useDenyRequestMutation,
  useDeleteShareMutation,
  useInviteToShareMutation,
  usePendingRequestsQuery,
  useResourceShareQuery,
  useRevokeGrantMutation,
  useRotateSlugMutation,
  useShareGrantsQuery,
  useUpdateShareMutation,
} from "@/hooks/use-shares";
import type { Share, ShareLinkAccess, ShareResourceType } from "@/lib/shares";

interface ShareDialogProps {
  resourceType: ShareResourceType;
  resourceId: string;
  resourceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The four link modes, in order of increasing openness. */
const LINK_MODES: {
  value: ShareLinkAccess;
  label: string;
  hint: string;
  icon: typeof Globe;
  /** plans.features key, when the mode is paid. Public is quota-gated instead. */
  feature?: string;
}[] = [
  { value: "disabled", label: "Restricted", hint: "Only people you invite", icon: Restricted },
  { value: "request", label: "Anyone can request", hint: "Visitors ask, you approve", icon: UserLock, feature: "privateShareRequests" },
  { value: "password", label: "Password protected", hint: "Anyone with the link and password", icon: Lock, feature: "passwordProtectedShares" },
  { value: "public", label: "Anyone with the link", hint: "No account needed", icon: Globe },
];

export function ShareDialog({ resourceType, resourceId, resourceName, open, onOpenChange }: ShareDialogProps) {
  const { data: share, isLoading } = useResourceShareQuery(resourceType, resourceId, open);
  const createShare = useCreateShareMutation();

  // A share row is created lazily — opening the dialog shouldn't mint a
  // slug for a collection the user is only peeking at.
  const ensureShare = React.useCallback(async (): Promise<Share> => {
    if (share) return share;
    return createShare.mutateAsync({ type: resourceType, id: resourceId });
  }, [share, createShare, resourceType, resourceId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 gap-5 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader className="border-b border-border/20 pb-3">
          <DialogTitle className="text-xs font-bold">Share</DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground truncate">{resourceName}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full rounded-full" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-full" />
          </div>
        ) : (
          <ShareBody
            share={share ?? null}
            ensureShare={ensureShare}
            resourceType={resourceType}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShareBody({
  share,
  ensureShare,
  resourceType,
  onClose,
}: {
  share: Share | null;
  ensureShare: () => Promise<Share>;
  resourceType: ShareResourceType;
  onClose: () => void;
}) {
  const directShares = usePlanFeature("directShares");
  // Hoisted, not read inside the LINK_MODES map below: a hook call in a
  // loop (and a conditional one, since only two modes are gated) breaks
  // the rules of hooks.
  const requestMode = usePlanFeature("privateShareRequests");
  const passwordMode = usePlanFeature("passwordProtectedShares");
  const publicShares = usePlanLimit("public_share_count");
  const updateShare = useUpdateShareMutation();

  const unlocked: Record<string, boolean> = {
    privateShareRequests: requestMode.enabled,
    passwordProtectedShares: passwordMode.enabled,
  };
  // Which plan to name on a locked option ("Lite", "Pro").
  const neededPlan: Record<string, string | null> = {
    privateShareRequests: requestMode.requiredPlan,
    passwordProtectedShares: passwordMode.requiredPlan,
  };

  const saved: ShareLinkAccess = share?.linkAccess ?? "disabled";

  // Picking "password protected" can't be saved until a password exists —
  // the API rejects the switch, and rightly so. So that one selection is
  // held locally to reveal the password field, and only committed once
  // there's a password to commit with. Every other mode saves on click.
  const [armingPassword, setArmingPassword] = React.useState(false);
  const linkAccess: ShareLinkAccess = armingPassword ? "password" : saved;

  React.useEffect(() => {
    // Resets local "arming" state once the server (an external system)
    // confirms the password mode actually saved.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "password") setArmingPassword(false);
  }, [saved]);

  async function setMode(next: ShareLinkAccess, password?: string) {
    if (next === "password" && password === undefined && !share?.hasPassword) {
      setArmingPassword(true);
      return;
    }

    const target = await ensureShare();
    try {
      await updateShare.mutateAsync({
        id: target.id,
        patch: password !== undefined ? { linkAccess: next, password } : { linkAccess: next },
      });
      setArmingPassword(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't change who can see this.", type: "error" });
    }
  }

  return (
    <div className="space-y-5 text-xs">
      <PeopleSection share={share} ensureShare={ensureShare} enabled={directShares.enabled} loading={directShares.loading} requiredPlan={directShares.requiredPlan} onClose={onClose} />

      <section className="space-y-2">
        <p className="font-semibold text-foreground">General access</p>
        <div className="space-y-1">
          {LINK_MODES.map((mode) => (
            <ModeRow
              key={mode.value}
              mode={mode}
              selected={linkAccess === mode.value}
              // Public is free but capped; the paid modes are feature-gated.
              locked={mode.feature ? !unlocked[mode.feature] : false}
              lockedPlan={mode.feature ? neededPlan[mode.feature] : null}
              atLimit={mode.value === "public" && linkAccess !== "public" && publicShares.isAtLimit}
              quota={
                mode.value === "public" && !publicShares.isUnlimited && publicShares.limit != null
                  ? `${publicShares.used} of ${publicShares.limit} used`
                  : null
              }
              pending={updateShare.isPending}
              onSelect={() => setMode(mode.value)}
              onClose={onClose}
            />
          ))}
        </div>
        {publicShares.isAtLimit && linkAccess !== "public" && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">{publicShares.message}</p>
        )}
      </section>

      {linkAccess === "password" && <PasswordSection share={share} onSet={(pw) => setMode("password", pw)} />}
      {saved === "public" && share && <IndexingToggle share={share} />}
      {share && saved === "request" && <RequestsSection shareId={share.id} />}
      {share && saved !== "disabled" && <LinkRow share={share} />}
      {share && <DangerRow share={share} onClose={onClose} resourceType={resourceType} />}
    </div>
  );
}

function ModeRow({
  mode,
  selected,
  locked,
  lockedPlan,
  atLimit,
  quota,
  pending,
  onSelect,
  onClose,
}: {
  mode: (typeof LINK_MODES)[number];
  selected: boolean;
  locked: boolean;
  lockedPlan: string | null;
  atLimit: boolean;
  quota: string | null;
  pending: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const disabled = locked || atLimit || pending;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected ? "border-primary/40 bg-primary/10" : "border-border hover:bg-foreground/5",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <HugeiconsIcon
        icon={mode.icon}
        strokeWidth={2.25}
        className={cn("mt-0.5 h-4 w-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          {mode.label}
          {locked && <ProBadge label={lockedPlan} />}
        </span>
        <span className="block text-[11px] text-muted-foreground">{mode.hint}</span>
        {quota && <span className="block text-[10px] text-muted-foreground/70">{quota}</span>}
      </span>
      {locked && (
        <Link
          href="/app/settings/billing"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="shrink-0 self-center text-[10px] font-semibold text-primary hover:underline"
        >
          Upgrade
        </Link>
      )}
    </button>
  );
}

function PeopleSection({
  share,
  ensureShare,
  enabled,
  loading,
  requiredPlan,
  onClose,
}: {
  share: Share | null;
  ensureShare: () => Promise<Share>;
  enabled: boolean;
  loading: boolean;
  requiredPlan: string | null;
  onClose: () => void;
}) {
  const [email, setEmail] = React.useState("");
  const invite = useInviteToShareMutation();
  const revoke = useRevokeGrantMutation();
  const { data: grants = [] } = useShareGrantsQuery(share?.id);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || invite.isPending) return;

    try {
      const target = await ensureShare();
      const grant = await invite.mutateAsync({ id: target.id, email: email.trim() });
      setEmail("");
      // "Pending" means no account exists for that address yet — say so,
      // rather than implying they already have access.
      toast.add({
        title: grant.status === "pending" ? "Invite sent" : "Access granted",
        description: grant.status === "pending" ? "They'll get access when they sign up." : undefined,
        type: "success",
      });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't send that invite.", type: "error" });
    }
  }

  if (loading) return <Skeleton className="h-8 w-full rounded-full" />;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        Share with people
        {!enabled && <ProBadge label={requiredPlan} />}
      </div>

      {enabled ? (
        <form onSubmit={handleInvite} className="flex items-center gap-1.5">
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="h-8 text-[11px]"
          />
          <Button type="submit" size="sm" disabled={invite.isPending || !email.trim()} className="h-8 shrink-0 rounded-full px-3 text-[11px]">
            {invite.isPending ? "Inviting…" : "Invite"}
          </Button>
        </form>
      ) : (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Invite specific people by email on a paid plan.{" "}
          <Link href="/app/settings/billing" onClick={onClose} className="font-semibold text-primary hover:underline">
            View plans &rarr;
          </Link>
        </p>
      )}

      {grants.length > 0 && (
        <ul className="space-y-1 pt-1">
          {grants.map((grant) => (
            <li key={grant.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-foreground/5">
              <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">{grant.name ?? grant.email}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                  grant.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {grant.status === "active" ? "Has access" : "Pending"}
              </span>
              <button
                type="button"
                aria-label={`Remove ${grant.email}`}
                disabled={revoke.isPending}
                onClick={() => share && revoke.mutate({ id: share.id, grantId: grant.id })}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <HugeiconsIcon icon={Trash} strokeWidth={2.25} className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PasswordSection({ share, onSet }: { share: Share | null; onSet: (password: string) => void }) {
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6 || saving) return;
    setSaving(true);
    await onSet(password);
    setPassword("");
    setSaving(false);
    toast.add({ title: "Password updated", description: "Anyone already viewing will need it again.", type: "success" });
  }

  return (
    <section className="space-y-2 rounded-xl border border-border p-3">
      <p className="font-semibold text-foreground">{share?.hasPassword ? "Change password" : "Set a password"}</p>
      {!share?.hasPassword && (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          The link stays off until you save one.
        </p>
      )}
      <form onSubmit={submit} className="flex items-center gap-1.5">
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
          minLength={6}
          className="h-8 text-[11px]"
        />
        <Button type="submit" size="sm" disabled={password.length < 6 || saving} className="h-8 shrink-0 rounded-full px-3 text-[11px]">
          Save
        </Button>
      </form>
      {/* There is no recovery flow — the app has no password infrastructure
          at all, so the owner is the only one who can reset this. */}
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Only you can see or reset this. Changing it signs everyone out of the link.
      </p>
    </section>
  );
}

function IndexingToggle({ share }: { share: Share }) {
  const updateShare = useUpdateShareMutation();

  return (
    <section className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
      <div className="min-w-0">
        <p className="font-semibold text-foreground">Allow search engines</p>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Off by default. Turn this on only if you want this page to show up in Google.
        </p>
      </div>
      <Switch
        checked={share.allowSearchIndexing}
        disabled={updateShare.isPending}
        onCheckedChange={(checked: boolean) =>
          updateShare.mutate({ id: share.id, patch: { allowSearchIndexing: checked } })
        }
      />
    </section>
  );
}

function RequestsSection({ shareId }: { shareId: string }) {
  const { data: all = [] } = usePendingRequestsQuery();
  const approve = useApproveRequestMutation();
  const deny = useDenyRequestMutation();
  const mine = all.filter((request) => request.shareId === shareId);

  if (mine.length === 0) return null;

  return (
    <section className="space-y-2 rounded-xl border border-border p-3">
      <p className="font-semibold text-foreground">
        {mine.length} pending {mine.length === 1 ? "request" : "requests"}
      </p>
      <ul className="space-y-2">
        {mine.map((request) => (
          <li key={request.id} className="space-y-1">
            <p className="truncate text-[11px] text-foreground">{request.requesterName ?? request.requesterEmail}</p>
            {request.message && <p className="text-[10px] italic text-muted-foreground">&ldquo;{request.message}&rdquo;</p>}
            <div className="flex gap-1.5">
              <Button
                size="sm"
                disabled={approve.isPending}
                onClick={() => approve.mutate({ id: shareId, requestId: request.id })}
                className="h-6 rounded-full px-2.5 text-[10px]"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={deny.isPending}
                onClick={() => deny.mutate({ id: shareId, requestId: request.id })}
                className="h-6 rounded-full px-2.5 text-[10px]"
              >
                Decline
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LinkRow({ share }: { share: Share }) {
  const rotate = useRotateSlugMutation();
  const url = typeof window !== "undefined" ? `${window.location.origin}/s/${share.slug}` : "";

  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Input readOnly value={url} className="h-8 font-mono text-[11px]" onFocus={(event) => event.currentTarget.select()} />
        <Button size="icon" variant="outline" aria-label="Copy link" className="h-8 w-8 shrink-0" onClick={() => void copyToClipboard(url)}>
          <HugeiconsIcon icon={Copy} strokeWidth={2.25} className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Generate a new link"
          title="Generate a new link (breaks the old one)"
          disabled={rotate.isPending}
          className="h-8 w-8 shrink-0"
          onClick={() => rotate.mutate(share.id)}
        >
          <HugeiconsIcon icon={Refresh} strokeWidth={2.25} className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ShareAnalytics shareId={share.id} totalViews={share.viewCount} detailsHref={`/app/shared/${share.id}`} />
    </section>
  );
}

function DangerRow({ share, onClose, resourceType }: { share: Share; onClose: () => void; resourceType: ShareResourceType }) {
  const remove = useDeleteShareMutation();

  return (
    <Button
      variant="outline"
      disabled={remove.isPending}
      onClick={async () => {
        try {
          await remove.mutateAsync(share.id);
          toast.add({ title: "Sharing turned off", type: "success" });
          onClose();
        } catch {
          toast.add({ title: `Couldn't stop sharing this ${resourceType}.`, type: "error" });
        }
      }}
      className="h-8 w-full rounded-full text-[11px] font-semibold text-destructive hover:text-destructive"
    >
      {remove.isPending ? "Stopping…" : "Stop sharing entirely"}
    </Button>
  );
}
