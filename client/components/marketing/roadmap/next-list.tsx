"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { apiFetch } from "@/lib/auth";
import { useCurrentUserQuery } from "@/context/UserContext";
import type { Roadmap } from "@/lib/roadmap";
import UpVoteButton from "@/components/shadcn-space/button/button-21";

interface Votes {
  counts: Record<string, number>;
  mine: string[];
}

const votesKey = ["roadmap-votes"] as const;

/**
 * The planned items, in order, each with what it will let you do and a vote.
 * Anyone sees the counts; voting takes an account (one vote per person per
 * item, server: modules/roadmap), and a signed-out click goes to sign in. A
 * vote shows at once and is undone if saving it fails.
 */
export function NextList({ items }: { items: Roadmap["next"] }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: user } = useCurrentUserQuery();
  const { data: votes } = useQuery({
    queryKey: votesKey,
    queryFn: () => apiFetch<Votes>("/roadmap/votes"),
    // The counts the page was built with, until the live ones (and your own votes) arrive.
    placeholderData: { counts: Object.fromEntries(items.map((item) => [item.slug, item.votes])), mine: [] },
    staleTime: 30_000,
  });

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
    <ol className="grid gap-3 md:grid-cols-2">
      {items.map((item, index) => {
        const voted = votes?.mine.includes(item.slug) ?? false;
        const count = votes?.counts[item.slug] ?? item.votes;
        const want = count === 0 ? "Be the first to vote" : count === 1 ? "1 person wants this" : `${count} people want this`;
        const vote = (
          <UpVoteButton
            voted={voted}
            count={count}
            // Signed out, a click goes to sign in instead.
            onToggle={() => (user ? toggle.mutate({ slug: item.slug, voted }) : router.push("/auth/login"))}
            label={!user ? `Sign in to upvote ${item.title} (${count})` : voted ? `Remove your vote for ${item.title} (${count})` : `Upvote ${item.title} (${count})`}
            title={!user ? "Sign in to vote" : voted ? "Click to take your vote back" : "Upvote"}
            className="shrink-0 self-start"
          />
        );
        return (
          <li key={item.slug} className="flex flex-col rounded-2xl bg-card p-6 ring-1 ring-foreground/[0.07]">
            <div className="flex gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  {index === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Next up</span>}
                  {item.area && <span className="rounded-full bg-muted px-2 py-0.5">{item.area}</span>}
                </div>
                <h3 className="mt-3 text-lg font-medium tracking-[-0.01em] text-foreground">{item.title}</h3>
              </div>
              {vote}
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{item.description}</p>
            {item.points.length > 0 && (
              <ul className="mt-4 space-y-2">
                {item.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-[15px] leading-relaxed text-foreground">
                    <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.25} className="mt-1 size-4 shrink-0 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-auto pt-5 text-sm text-muted-foreground">{want}</p>
          </li>
        );
      })}
    </ol>
  );
}
