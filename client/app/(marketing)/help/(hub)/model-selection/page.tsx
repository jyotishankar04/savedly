"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon as ArrowRight,
  Coins01Icon as Coins,
  FlashIcon as Flash,
  StarIcon as Star,
  Key01Icon as Key,
  GiftIcon as Gift,
  Search01Icon as Search,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { formatModelPrice, getModelCatalog, modelFitsRole, type AiRole, type CatalogModel } from "@/lib/ai-settings";

// Nothing here is hardcoded except which models we'd suggest for each need.
// Names, prices, context sizes and capabilities all come live from the
// OpenRouter catalog (via our API), so new models and price changes show up
// on their own. If a suggested model disappears, the cheapest model that fits
// the role takes its place.

const ROLES: { id: AiRole; label: string; usedFor: string }[] = [
  { id: "fast", label: "Fast", usedFor: "Tags, summaries, categories and auto-filing on every save" },
  { id: "reasoning", label: "Reasoning", usedFor: "The Ask SaveForLatter chat" },
  { id: "vision", label: "Vision", usedFor: "Reading and describing images you save" },
  { id: "embeddings", label: "Embeddings", usedFor: "Semantic search and Ask's memory lookup" },
];

interface Need {
  id: string;
  label: string;
  desc: string;
  icon: IconSvgElement;
  /** OpenRouter IDs in order of preference; the first one still listed wins. */
  picks: Record<AiRole, string[]>;
  tip: string;
}

const EMBEDDINGS = ["openai/text-embedding-3-small"];

const NEEDS: Need[] = [
  {
    id: "cheapest",
    label: "Lowest cost",
    desc: "Pay as little as possible",
    icon: Coins,
    picks: {
      fast: ["google/gemini-2.5-flash-lite", "openai/gpt-oss-20b"],
      reasoning: ["openai/gpt-oss-120b", "google/gemini-2.5-flash"],
      vision: ["google/gemini-2.5-flash-lite", "openai/gpt-5-nano"],
      embeddings: EMBEDDINGS,
    },
    tip: "The cheapest models that still do the job well.",
  },
  {
    id: "free",
    label: "Free to start",
    desc: "Try it without paying",
    icon: Gift,
    picks: {
      fast: ["google/gemini-2.5-flash-lite"],
      reasoning: ["google/gemini-2.5-flash"],
      vision: ["google/gemini-2.5-flash-lite"],
      embeddings: EMBEDDINGS,
    },
    tip: "With your own Google key, Gemini's free tier covers saving, images and Ask at no cost (with rate limits; Google may use free-tier data to improve its models). Skip embeddings if Settings → AI shows it's already covered for you.",
  },
  {
    id: "one-key",
    label: "Only one key",
    desc: "Keep setup simple",
    icon: Key,
    picks: {
      fast: ["openai/gpt-5-nano"],
      reasoning: ["openai/gpt-5-mini"],
      vision: ["openai/gpt-5-nano"],
      embeddings: EMBEDDINGS,
    },
    tip: "One OpenAI key covers all four roles. An OpenRouter key also works for everything: it can use any model on this page.",
  },
  {
    id: "fastest",
    label: "Fastest",
    desc: "Answers as quick as possible",
    icon: Flash,
    picks: {
      fast: ["openai/gpt-oss-20b"],
      reasoning: ["openai/gpt-oss-120b"],
      vision: ["google/gemini-2.5-flash-lite"],
      embeddings: EMBEDDINGS,
    },
    tip: "Run the GPT-OSS models on Groq for very fast saves and Ask replies. Groq has no image model, so vision uses Gemini.",
  },
  {
    id: "quality",
    label: "Best quality",
    desc: "Best answers, cost matters less",
    icon: Star,
    picks: {
      fast: ["anthropic/claude-haiku-4.5"],
      reasoning: ["anthropic/claude-sonnet-5", "anthropic/claude-haiku-4.5"],
      vision: ["anthropic/claude-haiku-4.5"],
      embeddings: EMBEDDINGS,
    },
    tip: "Claude gives the most careful tags and Ask answers, at a much higher cost than the cheapest setup.",
  },
];

// Rough size of one saved memory's Fast-role work, for the cost estimate.
const SAVE_INPUT_TOKENS = 5000;
const SAVE_OUTPUT_TOKENS = 1000;
const PAGE_SIZE = 50;

function pick(candidates: string[], role: AiRole, models: CatalogModel[]): CatalogModel | undefined {
  for (const id of candidates) {
    const found = models.find((m) => m.id === id);
    if (found) return found;
  }
  return models
    .filter((m) => modelFitsRole(m, role) && m.inputPrice !== null && m.inputPrice > 0)
    .sort((a, b) => (a.inputPrice ?? 0) - (b.inputPrice ?? 0))[0];
}

function costPerThousandSaves(model: CatalogModel | undefined): string | null {
  if (!model || model.inputPrice === null) return null;
  const perSave = (SAVE_INPUT_TOKENS * model.inputPrice + SAVE_OUTPUT_TOKENS * (model.outputPrice ?? 0)) / 1_000_000;
  const perThousand = perSave * 1000;
  return perThousand < 0.01 ? "under $0.01" : `about $${perThousand.toFixed(2)}`;
}

const perM = (n: number | null) =>
  n === null ? "—" : n === 0 ? "Free" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;

const contextLabel = (n: number | null) =>
  n === null ? "—" : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : `${Math.round(n / 1000)}K`;

type RoleFilter = AiRole | "all";
type SortKey = "cheapest" | "priciest" | "context" | "name";

export default function ModelSelectionPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["model-catalog"],
    queryFn: getModelCatalog,
    staleTime: 5 * 60 * 1000,
  });
  const models = useMemo(() => data?.models ?? [], [data]);

  const [needId, setNeedId] = useState(NEEDS[0].id);
  const need = NEEDS.find((n) => n.id === needId)!;

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [vendor, setVendor] = useState("all");
  const [sort, setSort] = useState<SortKey>("cheapest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const vendors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of models) counts.set(m.vendor, (counts.get(m.vendor) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [models]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = models.filter(
      (m) =>
        (roleFilter === "all" || modelFitsRole(m, roleFilter)) &&
        (vendor === "all" || m.vendor === vendor) &&
        (!q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)),
    );
    const price = (m: CatalogModel) => m.inputPrice ?? Infinity;
    return list.sort((a, b) => {
      if (sort === "cheapest") return price(a) - price(b);
      if (sort === "priciest") return (b.inputPrice ?? -1) - (a.inputPrice ?? -1);
      if (sort === "context") return (b.contextLength ?? 0) - (a.contextLength ?? 0);
      return a.name.localeCompare(b.name);
    });
  }, [models, query, roleFilter, vendor, sort]);

  const resetPaging = () => setVisible(PAGE_SIZE);
  const fastPick = pick(need.picks.fast, "fast", models);
  const saveCost = costPerThousandSaves(fastPick);

  return (
    <div className="max-w-6xl mx-auto px-6 space-y-16">
          {/* Header */}
          <div className="space-y-4">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link href="/help" className="hover:text-foreground transition-colors">
                Help Center
              </Link>
              <span aria-hidden>/</span>
              <span>Ask and AI</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight leading-[1.15]">Choosing your AI models</h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
              When you self-host SaveForLatter, you use your own AI key, so you choose the models and pay your provider directly. Pick what matters most to you and we&apos;ll suggest a model for each part of the app. Prices are live.
            </p>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading the latest models and prices…</p>
          ) : isError || models.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm space-y-3">
              <p className="text-muted-foreground">We couldn&apos;t load the live model list right now.</p>
              <button type="button" onClick={() => refetch()} className="text-primary hover:underline">
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Picker */}
              <section className="space-y-6">
                <h2 className="text-xl font-semibold">What matters most to you?</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {NEEDS.map((n) => {
                    const active = n.id === needId;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setNeedId(n.id)}
                        aria-pressed={active}
                        className={cn(
                          "text-left rounded-xl border p-4 transition-colors",
                          active ? "border-primary bg-primary/5" : "border-border/60 bg-card hover:border-primary/40",
                        )}
                      >
                        <HugeiconsIcon icon={n.icon} strokeWidth={2.25} className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                        <p className="mt-3 text-sm font-semibold">{n.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  <div className="divide-y divide-border/50">
                    {ROLES.map((role) => {
                      const model = pick(need.picks[role.id], role.id, models);
                      return (
                        <div key={role.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-5 py-4">
                          <div className="sm:w-56 shrink-0">
                            <p className="text-sm font-semibold">{role.label}</p>
                            <p className="text-xs text-muted-foreground">{role.usedFor}</p>
                          </div>
                          {model ? (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">{model.name}</p>
                                <code className="text-[11px] text-muted-foreground break-all">{model.id}</code>
                              </div>
                              <p className="text-xs text-muted-foreground tabular-nums sm:text-right">{formatModelPrice(model)}</p>
                            </>
                          ) : (
                            <p className="flex-1 text-xs text-muted-foreground">No suitable model is listed right now.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-5 py-4 text-xs text-muted-foreground bg-muted/30 border-t border-border/50 leading-relaxed space-y-1">
                    <p>{need.tip}</p>
                    {saveCost && <p>Saving 1,000 memories with this Fast model costs {saveCost} at today&apos;s prices.</p>}
                    <p>
                      IDs shown are OpenRouter&apos;s. With a key from the model&apos;s own provider, pick the same model in Settings → AI; it lists the exact names your key can use.
                    </p>
                  </div>
                </div>

                <Link
                  href="/app/settings/ai"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Set up your models
                  <HugeiconsIcon icon={ArrowRight} strokeWidth={2.25} className="h-4 w-4" />
                </Link>
              </section>

              {/* Chart */}
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Compare every model</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {models.length} models from {vendors.length} providers, live from OpenRouter
                    {data?.fetchedAt ? `, updated ${new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}. Prices are US dollars per 1 million tokens (about 750,000 words).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <HugeiconsIcon icon={Search} strokeWidth={2.25} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        resetPaging();
                      }}
                      placeholder="Search models, e.g. gemini, claude, llama"
                      aria-label="Search models"
                      className="w-full rounded-full border border-border bg-muted/40 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <select
                    value={vendor}
                    onChange={(e) => {
                      setVendor(e.target.value);
                      resetPaging();
                    }}
                    aria-label="Filter by provider"
                    className="rounded-full border border-border bg-muted/40 px-4 py-2 text-sm"
                  >
                    <option value="all">All providers</option>
                    {vendors.map(([v, count]) => (
                      <option key={v} value={v}>
                        {v} ({count})
                      </option>
                    ))}
                  </select>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    aria-label="Sort models"
                    className="rounded-full border border-border bg-muted/40 px-4 py-2 text-sm"
                  >
                    <option value="cheapest">Cheapest first</option>
                    <option value="priciest">Most expensive first</option>
                    <option value="context">Largest context first</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["all", ...ROLES.map((r) => r.id)] as RoleFilter[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={roleFilter === r}
                      onClick={() => {
                        setRoleFilter(r);
                        resetPaging();
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        roleFilter === r ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {r === "all" ? "All" : ROLES.find((x) => x.id === r)!.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-border/60">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="text-left font-semibold px-4 py-3">Model</th>
                        <th scope="col" className="text-left font-semibold px-4 py-3">Provider</th>
                        <th scope="col" className="text-right font-semibold px-4 py-3">Input</th>
                        <th scope="col" className="text-right font-semibold px-4 py-3">Output</th>
                        <th scope="col" className="text-right font-semibold px-4 py-3">Context</th>
                        <th scope="col" className="text-left font-semibold px-4 py-3">Good for</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filtered.slice(0, visible).map((m) => (
                        <tr key={m.id} className="align-top">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{m.name}</p>
                            <code className="text-[11px] text-muted-foreground break-all">{m.id}</code>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{m.vendor}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{perM(m.inputPrice)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{m.kind === "embedding" ? "—" : perM(m.outputPrice)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{contextLabel(m.contextLength)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {ROLES.filter((r) => modelFitsRole(m, r.id)).map((r) => (
                                <span key={r.id} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                                  {r.label}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                            No models match. Try a different search or filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    Showing {Math.min(visible, filtered.length)} of {filtered.length}
                  </span>
                  {visible < filtered.length && (
                    <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="text-primary hover:underline">
                      Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
                    </button>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Good to know */}
          <section className="space-y-3 max-w-3xl">
            <h2 className="text-xl font-semibold">Good to know</h2>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
              <li>An OpenRouter key can use every model listed here. Keys from OpenAI, Anthropic, Google, Groq or a custom endpoint can use that provider&apos;s own models.</li>
              <li>You can mix providers: each role in Settings → AI can use a different key.</li>
              <li>Reasoning needs a model that supports tools, and Vision one that reads images. The filters above apply these rules.</li>
              <li>Embeddings must produce 1536-dimensional vectors. text-embedding-3-small does; most other embedding models don&apos;t by default.</li>
              <li>Every model is tested when you save it in Settings → AI, so a mistyped name is caught right away.</li>
            </ul>
          </section>
    </div>
  );
}
