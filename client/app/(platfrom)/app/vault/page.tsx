"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockPasswordIcon as Lock, ArrowLeft01Icon as ArrowLeft } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Reveal } from "@/components/ui/reveal";
import { FolderCard } from "@/components/ui/folder-card";
import { MemoryGridCard } from "@/components/memory/memory-grid-card";
import { CollectionActionsMenu } from "@/components/collection/collection-actions-menu";
import { useMemoriesQuery } from "@/context/MemoryContext";
import { listCollections } from "@/lib/collections";
import { useQuery } from "@tanstack/react-query";
import { useLockVaultMutation, useSetVaultPinMutation, useUnlockVaultMutation, useVaultStatusQuery } from "@/hooks/use-vault";
import { cn } from "@/lib/utils";
import type { Collection, Memory } from "@/types/memory";
import { PageHeader, EmptyState } from "@/components/app-page";

const COLOR_PALETTE = [
  "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "bg-teal-500/10 text-teal-500 border-teal-500/20",
  "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
];

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

export default function VaultPage() {
  const status = useVaultStatusQuery();
  const lockMutation = useLockVaultMutation();

  // Read via a ref inside the effects below so they can depend on `[]` (run
  // once, clean up once) without capturing a stale `mutate` closure or
  // re-registering listeners — and without re-firing the "leaving" lock on
  // every render, which would happen if the mutation's own (identity-
  // changing) return object were a dependency instead.
  const lockRef = React.useRef(lockMutation.mutate);
  React.useEffect(() => {
    lockRef.current = lockMutation.mutate;
  });

  const [obscured, setObscured] = React.useState(false);

  // Privacy blur: dim the content immediately when this window loses
  // OS-level focus (e.g. alt-tabbing to another app) — a fast visual
  // response for the moment before a real lock (below) can round-trip.
  React.useEffect(() => {
    const obscure = () => setObscured(true);
    const reveal = () => setObscured(false);
    window.addEventListener("blur", obscure);
    window.addEventListener("focus", reveal);
    return () => {
      window.removeEventListener("blur", obscure);
      window.removeEventListener("focus", reveal);
    };
  }, []);

  // Real lock: switching browser tabs (or minimizing) revokes the unlock
  // outright — coming back requires the PIN again, not just an unblur.
  React.useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) lockRef.current();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Leaving the vault page entirely (route change) also locks it — handled
  // in the shared app layout (via a pathname-change effect), not here: an
  // unmount-cleanup in this component would also fire once, synthetically,
  // from React's StrictMode double-invoke in development, re-locking the
  // vault the instant this page first mounts.

  if (status.isLoading) return <PageSkeleton />;

  if (status.isError) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load the vault. Try reloading.</p>
      </div>
    );
  }

  if (!status.data?.hasPin) return <SetupGate />;
  if (!status.data.unlocked) return <UnlockGate />;
  return (
    <div className={cn("transition-[filter] duration-150", obscured && "pointer-events-none blur-md select-none")}>
      <VaultContents />
    </div>
  );
}

function GateShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Reveal className="mx-auto max-w-sm py-20 text-center">
      <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-card shadow-md">
          <HugeiconsIcon icon={Lock} strokeWidth={2.25} className="h-6 w-6 text-primary" />
        </div>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </Reveal>
  );
}

function SetupGate() {
  const [pin, setPin] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const setPinMutation = useSetVaultPinMutation();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pin.length < 4 || setPinMutation.isPending) return;
    if (pin !== confirm) {
      toast.add({ title: "PINs don't match", type: "error" });
      return;
    }
    try {
      await setPinMutation.mutateAsync({ newPin: pin });
      toast.add({ title: "Vault PIN set", type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't set the PIN.", type: "error" });
    }
  }

  return (
    <GateShell
      title="Set up your vault"
      description="Pick a PIN. Anything you move into the vault is hidden everywhere else — search, the graph, insights, sharing — until you enter it."
    >
      <form onSubmit={submit} className="space-y-3">
        <Input
          type="password"
          inputMode="numeric"
          required
          autoFocus
          minLength={4}
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="New PIN"
          className="h-9 text-center text-xs"
        />
        <Input
          type="password"
          inputMode="numeric"
          required
          minLength={4}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Confirm PIN"
          className="h-9 text-center text-xs"
        />
        <Button type="submit" size="lg" disabled={setPinMutation.isPending || pin.length < 4} className="w-full rounded-full">
          {setPinMutation.isPending ? "Saving…" : "Set PIN"}
        </Button>
      </form>
    </GateShell>
  );
}

function UnlockGate() {
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const unlockMutation = useUnlockVaultMutation();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!pin || unlockMutation.isPending) return;
    setError(null);
    try {
      await unlockMutation.mutateAsync(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect PIN.");
    }
  }

  return (
    <GateShell title="Vault is locked" description="Enter your PIN to see what's inside.">
      <form onSubmit={submit} className="space-y-3">
        <Input
          type="password"
          inputMode="numeric"
          required
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="PIN"
          className="h-9 text-center text-xs"
          aria-invalid={Boolean(error)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={unlockMutation.isPending || !pin} className="w-full rounded-full">
          {unlockMutation.isPending ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </GateShell>
  );
}

/** Once unlocked, the vault looks and behaves exactly like the main app:
 * collections render as the same folder cards as /app/collections, memories
 * render as the same grid cards as /app/memories (full action menus
 * included), and clicking a collection drills into its own memories instead
 * of leaving the vault. */
function VaultContents() {
  const [selectedCollectionId, setSelectedCollectionId] = React.useState<string | null>(null);
  const lockMutation = useLockVaultMutation();

  const collectionsQuery = useQuery({
    queryKey: ["collections", { vaulted: true }] as const,
    queryFn: () => listCollections(false, true),
  });
  const collections = collectionsQuery.data ?? [];
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId) ?? null;

  // If the collection currently open was just removed from the vault (or
  // deleted) from within its own menu, snap back to the vault root instead
  // of showing a stale, empty nested view.
  if (selectedCollectionId && !collectionsQuery.isLoading && !selectedCollection) {
    setSelectedCollectionId(null);
  }

  const { data: memoriesData, isLoading: memoriesLoading } = useMemoriesQuery({ isVaulted: true, limit: 100 });
  const memories = memoriesData?.items ?? [];

  const loading = collectionsQuery.isLoading || memoriesLoading;
  const empty = !loading && memories.length === 0 && collections.length === 0;

  const header = (
    <PageHeader
      title="Vault"
      description="Hidden from search, the graph, insights, and sharing until you unlock it."
      action={
        <Button
          variant="outline"
          disabled={lockMutation.isPending}
          onClick={() => lockMutation.mutate()}
          className="h-10 shrink-0 rounded-full px-4 text-sm font-medium"
        >
          <HugeiconsIcon icon={Lock} strokeWidth={2} className="h-4 w-4" /> Lock now
        </Button>
      }
    />
  );

  if (selectedCollection) {
    return <VaultCollectionView collection={selectedCollection} onBack={() => setSelectedCollectionId(null)} header={header} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      {header}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : empty ? (
        <EmptyState title="Nothing in the vault yet" description="Use “Move to vault” on a memory or collection to hide it here." className="py-16" />
      ) : (
        <div className="space-y-10">
          {collections.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">Collections</h2>
              <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
                {collections.map((col) => (
                  <div key={col.id} className="relative">
                    <FolderCard
                      onClick={() => setSelectedCollectionId(col.id)}
                      count={col.memoryCount}
                      label={col.name}
                      badge={col.icon}
                      badgeClassName={colorFor(col.id)}
                    />
                    <div className="absolute right-3 top-3 z-10">
                      <CollectionActionsMenu
                        collection={col}
                        trigger={
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm hover:text-foreground"
                          >
                            <HugeiconsIcon icon={Lock} strokeWidth={2} className="h-3.5 w-3.5" />
                          </button>
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {memories.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">Memories</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {memories.map((item) => (
                  <MemoryGridCardLink key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function VaultCollectionView({ collection, onBack, header }: { collection: Collection; onBack: () => void; header: React.ReactNode }) {
  const { data, isLoading } = useMemoriesQuery({ collectionId: collection.id, isVaulted: true, limit: 100 });
  const memories = data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 md:py-10">
      {header}

      <div className="space-y-6 border-t border-border/60 pt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowLeft} strokeWidth={2} className="h-4 w-4" /> Back to vault
        </button>

        <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-3xl">
              {collection.icon}
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{collection.name}</h2>
              {collection.description && <p className="mt-1 max-w-md text-[15px] leading-relaxed text-muted-foreground">{collection.description}</p>}
              <span className="mt-2 block text-sm text-muted-foreground">{collection.memoryCount} saved memories</span>
            </div>
          </div>
          <CollectionActionsMenu collection={collection} redirectTo="/app/vault" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-2xl" />
            ))}
          </div>
        ) : memories.length === 0 ? (
          <EmptyState title="No memories in this collection" className="py-14" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memories.map((item) => (
              <MemoryGridCardLink key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A vaulted memory's single-item GET is unguarded (same as a trashed item —
 * a direct link still resolves), so opening one just navigates to the real
 * memory detail page rather than needing an in-vault preview. */
function MemoryGridCardLink({ item }: { item: Memory }) {
  const router = useRouter();
  return <MemoryGridCard item={item} onClick={() => router.push(`/app/memories/${item.id}`)} />;
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  );
}
