"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LockPasswordIcon as Lock,
  UserLockIcon as UserLock,
  Clock01Icon as Clock,
  CancelCircleIcon as Denied,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Reveal } from "@/components/ui/reveal";
import { SharedResourceView } from "@/components/share/shared-resource-view";
import { ApiError } from "@/lib/auth";
import {
  cancelShareAccessRequest,
  getSharedResource,
  requestShareAccess,
  unlockShare,
  type ShareGateCode,
  type ShareStub,
  type SharedResourcePayload,
} from "@/lib/shares";

/**
 * Everything that happens when a shared link is NOT simply public.
 *
 * This is a client component on purpose. The server never renders gated
 * content — it can't see the visitor's session (different origin) and,
 * more importantly, anything it did render would land in the HTML where a
 * crawler or a link unfurler could read it. So the gate resolves in the
 * browser, with the session cookie attached, and swaps itself for the real
 * view once access is granted.
 */
export function ShareGate({
  slug,
  initialGate,
  stub,
}: {
  slug: string;
  /**
   * What the server saw as an anonymous caller, or null when it got a 404 —
   * which may mean the slug is dead OR that it's invite-only and this
   * visitor is on the list. Only the browser can tell those apart.
   */
  initialGate: ShareGateCode | null;
  stub: ShareStub | null;
}) {
  const [gate, setGate] = React.useState<ShareGateCode | null>(initialGate);
  const [payload, setPayload] = React.useState<SharedResourcePayload | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [dead, setDead] = React.useState(false);

  // The server's view was anonymous. Re-ask as *this visitor* — an owner or
  // a grantee sails straight through and never sees a gate at all.
  React.useEffect(() => {
    let cancelled = false;

    getSharedResource(slug)
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
        setGate(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const apiError = err instanceof ApiError ? err : null;
        // 404 as *this* visitor settles it: the link really is gone (or was
        // never ours to see).
        if (apiError?.status === 404) {
          setDead(true);
          return;
        }
        setGate((apiError?.code as ShareGateCode | undefined) ?? initialGate);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, initialGate]);

  const onUnlocked = React.useCallback(async () => {
    const data = await getSharedResource(slug);
    setPayload(data);
    setGate(null);
  }, [slug]);

  if (checking) return <GateSkeleton />;
  if (payload) return <SharedResourceView payload={payload} />;
  if (dead) return <NotAvailable />;

  // Fall back to a neutral stub when the server had nothing to tell us.
  const shape: ShareStub = stub ?? { slug, resourceType: "collection", linkAccess: "disabled", ownerName: null };

  switch (gate) {
    case "SHARE_PASSWORD_REQUIRED":
      return <PasswordGate slug={slug} stub={shape} onUnlocked={onUnlocked} />;
    case "SHARE_AUTH_REQUIRED":
      return <SignInGate slug={slug} stub={shape} />;
    case "SHARE_ACCESS_REQUIRED":
    case "SHARE_ACCESS_PENDING":
    case "SHARE_ACCESS_DENIED":
      return <RequestGate slug={slug} stub={shape} state={gate} />;
    default:
      return <NotAvailable />;
  }
}

function GateShell({
  icon,
  title,
  description,
  children,
}: {
  icon: typeof Lock;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Reveal className="mx-auto max-w-sm py-16 text-center">
      <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-card shadow-md">
          <HugeiconsIcon icon={icon} strokeWidth={2.25} className="h-6 w-6 text-primary" />
        </div>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </Reveal>
  );
}

function sharedThing(stub: ShareStub): string {
  return stub.resourceType === "collection" ? "collection" : "memory";
}

function PasswordGate({
  slug,
  stub,
  onUnlocked,
}: {
  slug: string;
  stub: ShareStub;
  onUnlocked: () => Promise<void>;
}) {
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!password.trim() || pending) return;

    setPending(true);
    setError(null);
    try {
      await unlockShare(slug, password);
      await onUnlocked();
    } catch (err) {
      // Wrong password is an expected outcome, so it's shown inline rather
      // than as a toast that slides away while you're still typing.
      setError(err instanceof ApiError && err.status === 401 ? "That password isn't right." : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <GateShell
      icon={Lock}
      title="This link is protected"
      description={`${stub.ownerName ?? "The owner"} set a password on this ${sharedThing(stub)}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="password"
          required
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="h-9 text-center text-xs"
          aria-invalid={Boolean(error)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={pending || !password.trim()} className="w-full rounded-full">
          {pending ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </GateShell>
  );
}

function SignInGate({ slug, stub }: { slug: string; stub: ShareStub }) {
  return (
    <GateShell
      icon={UserLock}
      title="Sign in to continue"
      description={`This ${sharedThing(stub)} is private. Sign in to ask ${stub.ownerName ?? "the owner"} for access.`}
    >
      {/* The ?next= is validated server-side against an exact /s/<slug>
          allowlist before it is ever used as a redirect. */}
      <Button
        size="lg"
        className="w-full rounded-full"
        render={<Link href={`/auth/login?next=${encodeURIComponent(`/s/${slug}`)}`} />}
      >
        Sign in
      </Button>
    </GateShell>
  );
}

function RequestGate({
  slug,
  stub,
  state,
}: {
  slug: string;
  stub: ShareStub;
  state: "SHARE_ACCESS_REQUIRED" | "SHARE_ACCESS_PENDING" | "SHARE_ACCESS_DENIED";
}) {
  const [status, setStatus] = React.useState(state);
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      await requestShareAccess(slug, message.trim() || undefined);
      setStatus("SHARE_ACCESS_PENDING");
      toast.add({ title: "Request sent", type: "success" });
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : "Couldn't send that request.",
        type: "error",
      });
    } finally {
      setPending(false);
    }
  }

  async function cancel() {
    setPending(true);
    try {
      await cancelShareAccessRequest(slug);
      setStatus("SHARE_ACCESS_REQUIRED");
      toast.add({ title: "Request withdrawn", type: "success" });
    } catch {
      toast.add({ title: "Couldn't withdraw that request.", type: "error" });
    } finally {
      setPending(false);
    }
  }

  if (status === "SHARE_ACCESS_PENDING") {
    return (
      <GateShell
        icon={Clock}
        title="Waiting on a decision"
        description={`${stub.ownerName ?? "The owner"} has your request. You'll get a notification when they respond.`}
      >
        <Button variant="outline" size="lg" disabled={pending} onClick={cancel} className="w-full rounded-full">
          Withdraw request
        </Button>
      </GateShell>
    );
  }

  if (status === "SHARE_ACCESS_DENIED") {
    return (
      <GateShell
        icon={Denied}
        title="Request declined"
        description={`${stub.ownerName ?? "The owner"} declined access to this ${sharedThing(stub)}.`}
      />
    );
  }

  return (
    <GateShell
      icon={UserLock}
      title="Ask for access"
      description={`This ${sharedThing(stub)} is private. Send ${stub.ownerName ?? "the owner"} a request and they'll decide.`}
    >
      <form onSubmit={submit} className="space-y-3">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Add a note (optional)"
          maxLength={500}
          rows={3}
          className="text-xs"
        />
        <Button type="submit" size="lg" disabled={pending} className="w-full rounded-full">
          {pending ? "Sending…" : "Request access"}
        </Button>
      </form>
    </GateShell>
  );
}

function NotAvailable() {
  return (
    <GateShell
      icon={Denied}
      title="Link not available"
      description="This link is invalid, or the owner has stopped sharing it."
    />
  );
}

function GateSkeleton() {
  return (
    <div className="mx-auto max-w-sm space-y-4 py-16 text-center">
      <Skeleton className="mx-auto h-12 w-12 rounded-2xl" />
      <Skeleton className="mx-auto h-7 w-48" />
      <Skeleton className="mx-auto h-4 w-64" />
      <Skeleton className="mx-auto h-9 w-full rounded-full" />
    </div>
  );
}
