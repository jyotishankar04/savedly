"use client";

import { Delete02Icon, Folder01Icon, GitMergeIcon, SquareLock01Icon, SquareUnlock01Icon } from "@hugeicons/core-free-icons";
import { SelectionBar, type SelectionAction } from "@/components/selection/selection-bar";
import { useMergeTargetPicker } from "@/components/selection/pickers";
import { useBatchDeleteCollectionsMutation, useBatchMergeCollectionsMutation, useBatchVaultCollectionsMutation } from "@/hooks/use-batch";
import type { Selection } from "@/hooks/use-selection";
import type { BatchResult } from "@/lib/batch-api";
import type { Collection } from "@/types/memory";

const n = (count: number) => `${count} ${count === 1 ? "collection" : "collections"}`;

function report(result: BatchResult, done: (count: number) => string): string {
  if (result.succeeded === 0) throw new Error("That didn't go through. Some of these may have changed; refresh and try again.");
  const message = done(result.succeeded);
  return result.failed > 0 ? `${message} ${result.failed} couldn't be changed.` : message;
}

/**
 * The bulk actions bar for the Collections page: merge, move into or out of
 * the vault, and delete, either keeping the memories or sending them to Trash.
 */
export function CollectionSelectionBar({ selection, collections, vaulted = false }: { selection: Selection; collections: Collection[]; vaulted?: boolean }) {
  const merge = useBatchMergeCollectionsMutation();
  const vault = useBatchVaultCollectionsMutation();
  const remove = useBatchDeleteCollectionsMutation();
  const mergePicker = useMergeTargetPicker();

  const ids = selection.ids;
  const selected = collections.filter((c) => selection.has(c.id));
  const memoryTotal = selected.reduce((sum, c) => sum + c.memoryCount, 0);

  const actions: SelectionAction[] = [
    ...(ids.length >= 2
      ? [
          {
            key: "merge",
            label: "Merge",
            icon: GitMergeIcon,
            run: async () => {
              const target = await mergePicker.pick(selected);
              return report(await merge.mutateAsync({ collectionIds: ids, targetId: target.id }), () => `${n(ids.length)} merged into ${target.name}.`);
            },
          },
        ]
      : []),
    {
      key: "vault",
      label: vaulted ? "Out of vault" : "Move to vault",
      icon: vaulted ? SquareUnlock01Icon : SquareLock01Icon,
      run: async () => {
        const result = await vault.mutateAsync({ collectionIds: ids, isVaulted: !vaulted });
        const failed = new Set((result.errors ?? []).map((e) => e.id));
        const done = ids.filter((id) => !failed.has(id));
        return {
          message: report(result, (c) => `${n(c)} ${vaulted ? "taken out of the vault" : "moved to the vault, with their memories"}.`),
          undo: async () => {
            await vault.mutateAsync({ collectionIds: done, isVaulted: vaulted }).catch((err) => {
              // Taking things out of the vault needs it unlocked; putting them in doesn't.
              throw err instanceof Error && /vault is locked/i.test(err.message) ? new Error("Unlock your vault to take them back out.") : err;
            });
            return vaulted ? "Back in the vault." : "Taken back out of the vault.";
          },
        };
      },
    },
    {
      key: "delete-keep",
      label: "Delete, keep memories",
      icon: Folder01Icon,
      destructive: true,
      confirm: {
        title: `Delete ${n(ids.length)}?`,
        description: `The ${ids.length === 1 ? "collection is" : "collections are"} removed. The memories inside stay in your library. Share links for ${ids.length === 1 ? "it" : "them"} stop working.`,
        confirmLabel: "Delete, keep memories",
      },
      run: async () => report(await remove.mutateAsync({ collectionIds: ids, memories: "keep" }), (c) => `${n(c)} deleted. Their memories are still in your library.`),
    },
    {
      key: "delete-trash",
      label: "Delete with memories",
      icon: Delete02Icon,
      destructive: true,
      confirm: {
        title: `Delete ${n(ids.length)} and their memories?`,
        description: `The ${ids.length === 1 ? "collection is" : "collections are"} removed, and the memories in ${ids.length === 1 ? "it" : "them"} (up to ${memoryTotal}) go to Trash, where you can restore them for 15 days.`,
        confirmLabel: "Delete with memories",
      },
      run: async () => report(await remove.mutateAsync({ collectionIds: ids, memories: "trash" }), (c) => `${n(c)} deleted; their memories are in Trash for 15 days.`),
    },
  ];

  return (
    <>
      <SelectionBar selection={selection} noun={["collection", "collections"]} actions={actions} />
      {mergePicker.element}
    </>
  );
}
