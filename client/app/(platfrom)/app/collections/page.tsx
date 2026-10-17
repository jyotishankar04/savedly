"use client";

import { CollectionSelectionBar } from "@/components/selection/collection-selection-bar";
import { SelectButton } from "@/components/selection/selection-bar";
import { SelectCheckbox, selectableProps } from "@/components/selection/select-checkbox";
import { useSelection } from "@/hooks/use-selection";
import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusIcon as Plus, EyeIcon as Eye, EyeOffIcon as EyeOff, MoreHorizontalIcon as MoreHorizontal } from "@hugeicons/core-free-icons";
import { CollectionActionsMenu } from "@/components/collection/collection-actions-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderCard } from "@/components/ui/folder-card";
import { CollectionFormDialog, type CollectionFormValues } from "@/components/collection/collection-form-dialog";
import { useCollectionsQuery, useConvertCollectionMutation, useCreateCollectionMutation } from "@/context/MemoryContext";
import { QueryErrorState } from "@/components/query-error-state";
import { PageHeader, EmptyState } from "@/components/app-page";
import { toast } from "@/components/ui/toast";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { PlanLimitNotice, ProBadge } from "@/components/plan-limit-notice";
import { cn } from "@/lib/utils";

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

export default function CollectionsPage() {
  const [showSystem, setShowSystem] = useState(false);
  const { data: allCollections = [], isLoading, isError, refetch } = useCollectionsQuery(showSystem);
  const createMutation = useCreateCollectionMutation();
  const convertMutation = useConvertCollectionMutation();
  const collectionLimit = usePlanLimit("collection_count");

  const collections = allCollections.filter((c) => c.source === "user");
  const selection = useSelection(collections.map((c) => c.id));
  const systemCollections = showSystem ? allCollections.filter((c) => c.source === "system") : [];

  const handleConvert = async (id: string) => {
    if (collectionLimit.isAtLimit) {
      toast.add({ title: collectionLimit.message ?? "You've reached your collection limit.", type: "error" });
      return;
    }
    try {
      await convertMutation.mutateAsync(id);
      toast.add({ title: "Added to your collections.", type: "success" });
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't convert this collection.", type: "error" });
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const handleCreateCollection = async (values: CollectionFormValues) => {
    if (collectionLimit.isAtLimit) return;
    try {
      await createMutation.mutateAsync({ name: values.name, icon: values.icon, description: values.description || undefined });
      setShowAddModal(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't create this collection.", type: "error" });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 md:py-10">

      <PageHeader
        title="Collections"
        description="Organize your memories around the topics that matter to you."
        dataTour="collections-header"
        action={
          <div className="flex items-center gap-2">
            {collections.length > 0 && <SelectButton selection={selection} className="h-10 rounded-full px-4" />}
            <Button
              variant="ghost"
              onClick={() => setShowSystem((v) => !v)}
              className="rounded-full px-3 text-sm font-medium text-muted-foreground flex items-center gap-1.5"
            >
              <HugeiconsIcon icon={showSystem ? EyeOff : Eye} strokeWidth={2} className="h-4 w-4" />
              {showSystem ? "Hide system" : "Show system"}
            </Button>
            <Button
              disabled={collectionLimit.isAtLimit}
              title={collectionLimit.isAtLimit ? collectionLimit.message ?? undefined : undefined}
              onClick={() => setShowAddModal(true)}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-medium shadow-sm flex items-center gap-1.5",
                collectionLimit.isAtLimit && "opacity-50 cursor-not-allowed",
              )}
            >
              {collectionLimit.isAtLimit ? (
                <>
                  Limit reached <ProBadge />
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Plus} strokeWidth={2} className="h-4 w-4" /> New collection
                </>
              )}
            </Button>
          </div>
        }
      />

      {collectionLimit.isAtLimit && (
        <PlanLimitNotice message={collectionLimit.message ?? "You've reached your collection limit."} />
      )}

      {/* Collections Grid */}
      {isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/45 bg-muted/75 p-1">
              <div className="p-5 rounded-lg border border-border/75 bg-card min-h-[150px] space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-2.5 w-4/5" />
                <div className="flex items-center justify-between pt-3 border-t border-border/20">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <EmptyState title="No collections yet" description="Create one to start organizing your memories." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-8">
          {collections.map((col) => (
            <div
              key={col.id}
              {...selectableProps(selection.isSelecting, (e) => selection.toggle(col.id, e))}
              className="group relative"
            >
              {/* Inside the lid's top-right corner: beside the ⋯ menu, and in its place while selecting. */}
              <SelectCheckbox
                checked={selection.has(col.id)}
                selecting={selection.isSelecting}
                onToggle={(e) => selection.toggle(col.id, e)}
                label={`Select ${col.name}`}
                className={cn("top-[2.6rem] left-auto", selection.isSelecting ? "right-4" : "right-[3.4rem]")}
              />
              <FolderCard
                href={`/app/collections/${col.id}`}
                count={col.memoryCount}
                label={col.name}
                badge={col.icon}
                badgeClassName={colorFor(col.id)}
                selected={selection.has(col.id)}
              />
              {/* Sibling of the FolderCard's own <Link>, not a child of it —
                  so opening the menu never triggers navigation. */}
              <div className={cn("absolute right-3.5 top-[2.35rem] z-10", selection.isSelecting && "hidden")}>
                <CollectionActionsMenu
                  collection={col}
                  trigger={
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm hover:text-foreground"
                    >
                      <HugeiconsIcon icon={MoreHorizontal} strokeWidth={2} className="h-4 w-4"/>
                    </button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System collections — onboarding defaults / AI-suggested groupings.
          Deliberately not FolderCard: these aren't full-page navigable until
          claimed, so "Make it mine" reads as the primary action, not a link. */}
      {showSystem && systemCollections.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border/20">
          <div>
            <h2 className="text-sm font-medium text-foreground">System collections</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Created automatically — claim one to make it yours and start organizing memories into it directly.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {systemCollections.map((col) => (
              <div key={col.id} className="flex items-center justify-between gap-3 p-4 border border-dashed border-border rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base">{col.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{col.name}</p>
                    <p className="text-[13px] text-muted-foreground">{col.memoryCount} memories</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  disabled={convertMutation.isPending || collectionLimit.isAtLimit}
                  title={collectionLimit.isAtLimit ? collectionLimit.message ?? undefined : undefined}
                  onClick={() => handleConvert(col.id)}
                  className={cn(
                    "shrink-0 h-7 rounded-full text-[10px] font-bold px-3 flex items-center gap-1",
                    collectionLimit.isAtLimit && "opacity-50 cursor-not-allowed",
                  )}
                >
                  Make it mine
                  {collectionLimit.isAtLimit && <ProBadge />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <CollectionSelectionBar selection={selection} collections={collections} />

      <CollectionFormDialog
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title="New collection"
        description="Group memories around a topic. You can add to it any time."
        submitLabel={collectionLimit.isAtLimit ? "Limit reached" : "Create collection"}
        pending={createMutation.isPending}
        disabled={collectionLimit.isAtLimit}
        notice={collectionLimit.isAtLimit ? <PlanLimitNotice message={collectionLimit.message ?? "You've reached your collection limit."} /> : null}
        onSubmit={handleCreateCollection}
      />

      {/* Local animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

    </div>
  );
}
