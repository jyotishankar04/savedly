"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { apiFetch } from "@/lib/auth";
import { useCurrentUserQuery } from "@/context/UserContext";
import type { RoadmapItem } from "@/lib/roadmap";
import { cn } from "@/lib/utils";

interface Votes {
  counts: Record<string, number>;
  mine: string[];
}

const votesKey = ["roadmap-votes"] as const;

/**
 * The "Coming next" items, each with a vote. Anyone sees the counts; voting
 * takes an account (one vote per person per item, server: modules/roadmap),
 * and a signed-out click goes to sign in. A vote shows at once and is undone
 * if saving it fails.
 */
export function NextList({ items }: { items: RoadmapItem[] }) {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUserQuery();
  const { data: votes } = useQuery({ queryKey: votesKey, queryFn: () => apiFetch<Votes>("/roadmap/votes"), staleTime: 30_000 });

  const toggle = useMutation({
    mutationFn: ({ slug, voted }: { slug: string; voted: boolean }) => apiFetch<Votes>(`/roadmap/votes/${slug}`, { method: voted ? "DELETE" : "POST" }),
    onMutate: async ({ slug, voted }) => {
      await queryClient.cancelQueries({ queryKey: votesKey });
      const before = queryClient.getQueryData<Votes>(votesKey);
      if (before) {
        queryClient.setQueryData<Votes>(votesKey, {
          counts: { ...before.counts, [slug]: Math.max(0, (before.counts[slug] ?? 0) + (voted ? -1 : 1)) },
          mine: voted ? before.mine.filter((s) => s !== slug) : [...before.mine, slug],
        });
      }
      return { before };
    },
    onError: (_error, _vars, context) => context?.before && queryClient.setQueryData(votesKey, context.before),
    onSuccess: (data) => queryClient.setQueryData(votesKey, data),
  });

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((item) => {
        const voted = votes?.mine.includes(item.slug) ?? false;
        const count = votes?.counts[item.slug];
        const label = voted ? `Remove your vote for ${item.title}` : `Vote for ${item.title}`;
        const button = cn(
          "flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 self-stretch rounded-xl text-sm font-medium tabular-nums transition-colors",
          voted ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-foreground/10",
        );
        const inner = (
          <>
            <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2.25} className="size-4" />
            {/* Width held while the count loads, so nothing shifts. */}
            <span className="min-w-[2ch] text-center">{count ?? "·"}</span>
          </>
        );
        return (
          <li key={item.slug} className="flex gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/[0.07]">
            {user ? (
              <button type="button" aria-label={label} aria-pressed={voted} title={label} className={button} onClick={() => toggle.mutate({ slug: item.slug, voted })}>
                {inner}
              </button>
            ) : (
              <Link href="/auth/login" aria-label={`Sign in to vote for ${item.title}`} title="Sign in to vote" className={button}>
                {inner}
              </Link>
            )}
            <div className="min-w-0 py-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-medium text-foreground">{item.title}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.area}</span>
              </div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
