"use client";

import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon as Alert } from "@hugeicons/core-free-icons";
import { getAiHealth } from "@/lib/ai-usage";

const PROVIDER_NAME: Record<string, string> = { openai: "OpenAI", anthropic: "Anthropic", groq: "Groq", google: "Google", openrouter: "OpenRouter" };

/**
 * Shown across the admin area while the instance's own AI account is being
 * refused for lack of credits. Nothing else tells an operator: saves still
 * succeed, just without a summary or tags, and Ask has no answer.
 */
export function AiHealthBanner() {
  const { data } = useQuery({ queryKey: ["admin", "ai-health"], queryFn: getAiHealth, refetchInterval: 60_000 });
  if (!data || data.ok) return null;

  const provider = (data.provider && PROVIDER_NAME[data.provider]) || "The AI provider";
  const since = data.since ? new Date(data.since).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;
  return (
    <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
      <HugeiconsIcon icon={Alert} strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-foreground">AI is not running: the provider account has no credits</p>
        <p className="mt-0.5 text-muted-foreground">
          {provider} is refusing requests{since ? ` (first seen ${since})` : ""}. New saves get no summary or tags, and Ask can&apos;t answer. Add credits to the account;
          this notice clears by itself on the next request that works.
        </p>
      </div>
    </div>
  );
}
