"use client";

import { announceOutcome, type ActionOutcome } from "@/components/selection/selection-bar";
import { Cancelled, useRemindPicker } from "@/components/selection/pickers";
import { toast } from "@/components/ui/toast";
import { openUpgradeDialog } from "@/components/upgrade-dialog";
import { useUpdateMemoryMutation } from "@/context/MemoryContext";
import { useBatchReadMutation, useBatchRemindMutation } from "@/hooks/use-batch";
import { usePlanFeature } from "@/hooks/use-plan-limit";
import { formatRemindAt } from "@/lib/remind";

export interface RemindTarget {
  id: string;
  title: string;
  remindAt?: string | null;
  readAt?: string | null;
}

const n = (count: number) => `${count} ${count === 1 ? "memory" : "memories"}`;
const short = (title: string) => (title.length > 40 ? `${title.slice(0, 40).trimEnd()}…` : title);

/**
 * Sets one value on memories: one goes through the memory itself (every
 * plan), several through the bulk endpoint (Lite+, checked by the caller).
 */
function useSetter() {
  const update = useUpdateMemoryMutation();
  const remindMany = useBatchRemindMutation();
  const readMany = useBatchReadMutation();
  return {
    remind: async (ids: string[], remindAt: string | null) => {
      if (ids.length === 1) await update.mutateAsync({ id: ids[0]!, patch: { remindAt } });
      else await remindMany.mutateAsync({ memoryIds: ids, remindAt });
    },
    read: async (ids: string[], read: boolean) => {
      if (ids.length === 1) await update.mutateAsync({ id: ids[0]!, patch: { isRead: read } });
      else await readMany.mutateAsync({ memoryIds: ids, read });
    },
  };
}

/** Puts each memory's previous reminder back, grouped so it's one call per distinct time. */
async function restoreReminders(items: RemindTarget[], remind: (ids: string[], at: string | null) => Promise<void>) {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const key = item.remindAt && new Date(item.remindAt).getTime() > Date.now() ? item.remindAt : "";
    groups.set(key, [...(groups.get(key) ?? []), item.id]);
  }
  await Promise.all([...groups].map(([at, ids]) => remind(ids, at || null)));
}

/**
 * "Remind me" for one memory or several: asks when, sets it, and says so in
 * a toast with Undo (which puts back whatever reminder each one had).
 * `pickAndSet` is for the selection bar, which shows the toast itself.
 */
export function useRemindMe() {
  const picker = useRemindPicker();
  const set = useSetter();
  const bulk = usePlanFeature("batchOperations");

  const pickAndSet = async (items: RemindTarget[]): Promise<ActionOutcome> => {
    const title = items.length === 1 ? `Remind me about “${short(items[0]!.title)}”` : `Remind me about ${n(items.length)}`;
    const at = await picker.pick(title, items.length === 1 ? (items[0]!.remindAt ?? null) : null);
    await set.remind(
      items.map((i) => i.id),
      at,
    );
    const what = items.length === 1 ? "It" : `${n(items.length)}`;
    return {
      message: at ? `${what} will come back ${formatRemindAt(at)}.` : items.length === 1 ? "Reminder cancelled." : "Reminders cancelled.",
      undo: async () => {
        await restoreReminders(items, set.remind);
        return at ? "Reminder taken off." : "Reminder back on.";
      },
    };
  };

  const remind = async (items: RemindTarget[]) => {
    if (items.length === 0) return;
    if (items.length > 1 && !bulk.allowed) {
      openUpgradeDialog();
      return;
    }
    try {
      announceOutcome(await pickAndSet(items));
    } catch (err) {
      if (err instanceof Cancelled) return;
      toast.add({ title: err instanceof Error ? err.message : "Couldn't set the reminder.", type: "error" });
    }
  };

  return { remind, pickAndSet, element: picker.element };
}

/** Marks memories read (out of the Inbox) or unread (back in), with Undo. */
export function useMarkRead() {
  const set = useSetter();
  const bulk = usePlanFeature("batchOperations");

  const outcome = async (items: RemindTarget[], read: boolean): Promise<ActionOutcome> => {
    const changing = items.filter((i) => !!i.readAt !== read);
    const ids = (changing.length ? changing : items).map((i) => i.id);
    await set.read(ids, read);
    const what = ids.length === 1 && items.length === 1 ? `“${short(items[0]!.title)}”` : n(ids.length);
    return {
      message: read ? `${what} marked as read.` : `${what} back in your Inbox.`,
      undo: async () => {
        await set.read(ids, !read);
        return read ? "Back in your Inbox." : "Marked as read again.";
      },
    };
  };

  const mark = async (items: RemindTarget[], read: boolean) => {
    if (items.length === 0) return;
    if (items.length > 1 && !bulk.allowed) {
      openUpgradeDialog();
      return;
    }
    try {
      announceOutcome(await outcome(items, read));
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "That didn't work. Try again.", type: "error" });
    }
  };

  return { mark, outcome };
}
