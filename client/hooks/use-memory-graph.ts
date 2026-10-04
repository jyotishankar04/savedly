import { useQuery } from "@tanstack/react-query";
import { getMemoryGraph } from "@/lib/memory-graph";

export const memoryGraphQueryKey = ["memories", "graph"];

// One heavy, unpaginated payload (every node plus every derived edge), so it
// gets a longer staleTime than the 30s app-wide default — same reasoning as
// the other expensive-but-slow-moving queries in this codebase.
export function useMemoryGraphQuery() {
  return useQuery({ queryKey: memoryGraphQueryKey, queryFn: getMemoryGraph, staleTime: 60_000 });
}
