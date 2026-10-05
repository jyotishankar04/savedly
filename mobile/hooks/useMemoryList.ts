import { useCallback, useEffect, useRef, useState } from "react";
import { listMemories, type ListMemoriesParams, type Memory } from "@/lib/memories";

const PAGE_SIZE = 20;

/**
 * Shared list+pagination logic for every memories view (Memories, Search,
 * Favorites, Archive, Trash, a Collection, a Tag) — they all hit the same
 * GET /memories endpoint with different filter params, mirroring the web
 * client's pattern of one listMemories() call reused everywhere.
 */
export function useMemoryList(params: ListMemoriesParams, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const [items, setItems] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(1);
  // Params change identity every render (new object) — stringify to key the effect.
  const paramsKey = JSON.stringify(params);

  const load = useCallback(
    async (page: number, mode: "replace" | "append") => {
      if (!enabled) return;
      try {
        setError(null);
        if (mode === "replace" && items.length === 0) setLoading(true);
        const result = await listMemories({ ...params, page, limit: PAGE_SIZE });
        pageRef.current = page;
        setHasMore(result.items.length === PAGE_SIZE && page * PAGE_SIZE < result.total);
        setItems((prev) => (mode === "append" ? [...prev, ...result.items] : result.items));
      } catch {
        setError("Couldn't load memories. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paramsKey stands in for params
    [enabled, paramsKey],
  );

  useEffect(() => {
    pageRef.current = 1;
    load(1, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, paramsKey]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load(1, "replace");
  }, [load]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    load(pageRef.current + 1, "append");
  }, [loadingMore, loading, hasMore, load]);

  const patchItem = useCallback((id: string, patch: Partial<Memory>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { items, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, patchItem, removeItem };
}
