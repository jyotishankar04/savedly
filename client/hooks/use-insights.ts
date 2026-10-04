import { useQuery } from "@tanstack/react-query";
import { getInsights } from "@/lib/insights";

export const insightsQueryKey = ["insights"];

// Aggregates over the whole vault — expensive to recompute and slow-moving,
// so it gets a longer staleTime than the 30s app-wide default.
export function useInsightsQuery() {
  return useQuery({ queryKey: insightsQueryKey, queryFn: getInsights, staleTime: 60_000 });
}
