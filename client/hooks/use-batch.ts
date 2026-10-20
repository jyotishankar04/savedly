import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  batchTagMemories,
  batchMoveToCollection,
  batchDeleteMemories,
  batchRestoreMemories,
  batchUpdateStatus,
  batchUncollectMemories,
  batchReadMemories,
  batchRemindMemories,
  batchDeleteCollections,
  batchMergeCollections,
  batchVaultCollections,
  type BatchTagInput,
  type BatchMoveInput,
  type BatchDeleteInput,
  type BatchRestoreInput,
  type BatchStatusInput,
} from "@/lib/batch-api";

export function useBatchTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BatchTagInput) => batchTagMemories(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useBatchMoveToCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BatchMoveInput) => batchMoveToCollection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useBatchDeleteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BatchDeleteInput) => batchDeleteMemories(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useBatchRestoreMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BatchRestoreInput) => batchRestoreMemories(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useBatchUpdateStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BatchStatusInput) => batchUpdateStatus(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

/** Everything a collection change can touch: lists, counts and the trash. */
function useInvalidateLibrary() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ["memories", "collections", "tags", "trash", "favorites"]) queryClient.invalidateQueries({ queryKey: [key] });
  };
}

export function useBatchUncollectMutation() {
  const invalidate = useInvalidateLibrary();
  return useMutation({ mutationFn: batchUncollectMemories, onSuccess: invalidate });
}

export function useBatchReadMutation() {
  const invalidate = useInvalidateLibrary();
  return useMutation({ mutationFn: batchReadMemories, onSuccess: invalidate });
}

export function useBatchRemindMutation() {
  const invalidate = useInvalidateLibrary();
  return useMutation({ mutationFn: batchRemindMemories, onSuccess: invalidate });
}

export function useBatchDeleteCollectionsMutation() {
  const invalidate = useInvalidateLibrary();
  return useMutation({ mutationFn: batchDeleteCollections, onSuccess: invalidate });
}

export function useBatchMergeCollectionsMutation() {
  const invalidate = useInvalidateLibrary();
  return useMutation({ mutationFn: batchMergeCollections, onSuccess: invalidate });
}

export function useBatchVaultCollectionsMutation() {
  const invalidate = useInvalidateLibrary();
  return useMutation({ mutationFn: batchVaultCollections, onSuccess: invalidate });
}
