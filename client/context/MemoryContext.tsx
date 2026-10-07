"use client";

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import type { Collection, Memory } from "@/types/memory";
import {
  convertCollectionToUser,
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "@/lib/collections";
import { listTags } from "@/lib/tags";
import { expectNotificationsSoon } from "@/hooks/use-notifications";
import {
  createMemory,
  deleteMemory,
  getMemory,
  listMemories,
  updateMemory,
  type CreateMemoryInput,
  type ListMemoriesParams,
  type UpdateMemoryInput,
} from "@/lib/memories";

export const memoriesQueryKey = (params: ListMemoriesParams = {}) => ["memories", params] as const;
// No-arg form is deliberately just ["collections"] (not, say,
// ["collections", { includeSystem: false }]) — TanStack Query invalidates by
// key-array prefix, so invalidating this base key matches both the
// includeSystem:true and :false query variants at once.
export function collectionsQueryKey(includeSystem?: boolean) {
  return includeSystem === undefined ? (["collections"] as const) : (["collections", { includeSystem }] as const);
}
export const tagsQueryKey = () => ["tags"] as const;
export const memoryQueryKey = (id: string) => ["memory", id] as const;

export function useMemoriesQuery(params: ListMemoriesParams = {}) {
  return useQuery({
    queryKey: memoriesQueryKey(params),
    queryFn: () => listMemories(params),
    // Self-limiting: only keeps polling while something on the current page
    // is still mid-ingestion (see MemoryThumbnail's "Processing" badge) —
    // stops once everything's been enriched, so this never becomes constant
    // background chatter.
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((item) => item.resourceCategory === null) ? 4000 : false;
    },
  });
}

export function useCollectionsQuery(includeSystem = false) {
  return useQuery({ queryKey: collectionsQueryKey(includeSystem), queryFn: () => listCollections(includeSystem) });
}

export function useTagsQuery() {
  return useQuery({ queryKey: tagsQueryKey(), queryFn: listTags });
}

export function useCreateCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCollectionInput) => createCollection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKey() });
    },
  });
}

export function useDeleteCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });
}

export function useConvertCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => convertCollectionToUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionsQueryKey() });
    },
  });
}

export function useUpdateCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCollectionInput }) => updateCollection(id, patch),
    onSuccess: () => {
      // A vault toggle can also move memories in/out of view (cascade to
      // members), so both caches need a refetch, not just collections.
      queryClient.invalidateQueries({ queryKey: collectionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });
}

export function useMemoryQuery(id: string, options?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getMemory>>>>) {
  return useQuery({
    queryKey: memoryQueryKey(id),
    queryFn: () => getMemory(id),
    enabled: Boolean(id),
    // Same self-limiting poll as useMemoriesQuery — keeps the detail page's
    // "Savedly Understood" panel live while this specific memory is still
    // being ingested.
    refetchInterval: (query) => (query.state.data?.resourceCategory === null ? 4000 : false),
    ...options,
  });
}

/** Patches every cached memory-list page in place — used for optimistic favorite toggles. */
function patchCachedMemory(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<Memory>,
) {
  queryClient.setQueriesData<{ items: Memory[]; page: number; limit: number; total: number }>(
    { queryKey: ["memories"] },
    (old) => (old ? { ...old, items: old.items.map((m) => (m.id === id ? { ...m, ...patch } : m)) } : old),
  );
}

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) => updateMemory(id, { isFavorite }),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ["memories"] });
      patchCachedMemory(queryClient, id, { isFavorite });
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: memoryQueryKey(id) });
    },
  });
}

export function useMoveToTrashMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateMemory(id, { inTrash: true }),
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: memoryQueryKey(id) });
    },
  });
}

export function useUpdateMemoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateMemoryInput }) => updateMemory(id, patch),
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: memoryQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: collectionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: tagsQueryKey() });
    },
  });
}

export function useDeleteMemoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMemory(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: collectionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: tagsQueryKey() });
      queryClient.removeQueries({ queryKey: memoryQueryKey(id) });
    },
  });
}

export function useCreateMemoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMemoryInput) => createMemory(input),
    onSuccess: () => {
      // Processing may find an event; surface its popup within seconds.
      expectNotificationsSoon();
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: collectionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: tagsQueryKey() });
    },
  });
}

/**
 * Compatibility surface mirroring the old context-based API, so pages that
 * just need "the full memory list + collections + simple mutations" don't
 * have to wire up React Query directly. Pages needing filtered/paginated
 * lists should call {@link useMemoriesQuery} with their own params instead.
 */
export function useMemories() {
  const memoriesQuery = useMemoriesQuery({ limit: 100 });
  const collectionsQuery = useCollectionsQuery();
  const queryClient = useQueryClient();

  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const moveToTrashMutation = useMoveToTrashMutation();
  const deleteMutation = useDeleteMemoryMutation();
  const createMutation = useCreateMemoryMutation();

  const memories = memoriesQuery.data?.items ?? [];
  const collections: Collection[] = collectionsQuery.data ?? [];

  return {
    memories,
    collections,
    loading: memoriesQuery.isLoading || collectionsQuery.isLoading,
    error:
      (memoriesQuery.error instanceof Error ? memoriesQuery.error.message : null) ??
      (collectionsQuery.error instanceof Error ? collectionsQuery.error.message : null),
    refresh: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["memories"] }),
        queryClient.invalidateQueries({ queryKey: collectionsQueryKey() }),
      ]);
    },
    toggleFavorite: async (id: string) => {
      const target = memories.find((m) => m.id === id);
      if (!target) return;
      await toggleFavoriteMutation.mutateAsync({ id, isFavorite: !target.isFavorite });
    },
    moveToTrash: async (id: string) => {
      await moveToTrashMutation.mutateAsync(id);
    },
    deleteForever: async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    create: async (input: CreateMemoryInput) => createMutation.mutateAsync(input),
  };
}
