"use client";

import { CollectionFormDialog, type CollectionFormValues } from "@/components/collection/collection-form-dialog";
import { toast } from "@/components/ui/toast";
import { useUpdateCollectionMutation } from "@/context/MemoryContext";
import type { Collection } from "@/types/memory";

interface EditCollectionDialogProps {
  collection: Pick<Collection, "id" | "name" | "icon" | "description">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCollectionDialog({ collection, open, onOpenChange }: EditCollectionDialogProps) {
  const updateMutation = useUpdateCollectionMutation();

  async function submit(values: CollectionFormValues) {
    try {
      await updateMutation.mutateAsync({ id: collection.id, patch: values });
      toast.add({ title: "Collection updated", type: "success" });
      onOpenChange(false);
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Couldn't update this collection.", type: "error" });
    }
  }

  return (
    <CollectionFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit collection"
      description="Rename it, change its icon, or say what it's for."
      submitLabel="Save changes"
      initial={{ name: collection.name, icon: collection.icon, description: collection.description ?? "" }}
      pending={updateMutation.isPending}
      onSubmit={submit}
    />
  );
}
