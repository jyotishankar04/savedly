import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  batchTagMemories,
  batchMoveToCollection,
  batchDeleteMemories,
  batchRestoreMemories,
  batchUpdateStatus,
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
    },
  });
}
