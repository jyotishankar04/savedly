import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { advancedSearch, type AdvancedSearchInput } from "@/lib/advanced-search";

export function useAdvancedSearch(input: AdvancedSearchInput, enabled: boolean = true) {
  return useQuery({
    queryKey: ["search", "advanced", input],
    queryFn: () => advancedSearch(input),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAdvancedSearchInfinite(input: Omit<AdvancedSearchInput, "offset" | "limit">) {
  return useInfiniteQuery({
    queryKey: ["search", "advanced", "infinite", input],
    queryFn: ({ pageParam = 0 }) =>
      advancedSearch({
        ...input,
        offset: pageParam,
        limit: 20,
      }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length * 20 : undefined,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
  });
}
